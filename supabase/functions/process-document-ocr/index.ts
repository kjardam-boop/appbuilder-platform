/**
 * process-document-ocr
 * 
 * Extracts text from PDF/image documents.
 * 
 * Methods:
 * - PDF with searchable text: pdf-parse library + optional GPT structuring
 * - Images: OpenAI Vision API
 * 
 * Can be called:
 * 1. Directly after document upload (sync)
 * 2. Via database webhook on INSERT (async)
 * 3. For batch processing of pending documents
 * 
 * Supports: PDF, JPG, PNG, GIF, WebP
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
// unpdf - PDF text extraction for edge environments
import { extractText } from 'https://esm.sh/unpdf@0.11.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  // Document mode (from content_library)
  documentId?: string;  // content_library.id
  tenantId?: string;   // For RLS verification
  forceReprocess?: boolean;
  
  // Test mode (direct base64 input)
  testMode?: boolean;
  imageBase64?: string;
  mimeType?: string;
  config?: Record<string, unknown>;
}

interface OCRResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  provider: string;
  processingTimeMs: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: RequestBody = await req.json();
    const { documentId, tenantId, forceReprocess = false, testMode, imageBase64, mimeType, config } = body;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OCR service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // TEST MODE: Direct base64 file processing
    // ============================================
    if (testMode && imageBase64) {
      const effectiveMimeType = mimeType || 'image/png';
      const isPdf = effectiveMimeType === 'application/pdf';
      
      console.log(`[process-document-ocr] Test mode - processing ${(imageBase64.length / 1024).toFixed(1)}KB ${isPdf ? 'PDF' : 'image'}`);
      
      let extractedText = '';
      let provider = 'openai_vision';
      
      if (isPdf) {
        // ===== PDF: Use unpdf to extract text =====
        provider = 'unpdf';
        try {
          // Convert base64 to Uint8Array
          const binaryString = atob(imageBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Extract text using unpdf (returns array of strings per page)
          const result = await extractText(bytes);
          const textArray = result.text;
          const totalPages = result.totalPages;
          
          // Join array of page texts into single string
          extractedText = Array.isArray(textArray) 
            ? textArray.join('\n\n') 
            : String(textArray || '');
          
          console.log(`[process-document-ocr] PDF parsed: ${totalPages} pages, ${extractedText.length} chars`);
          
          // Optional: Use GPT to structure/clean the extracted text
          const structureWithGpt = config?.structureWithGpt !== false; // default true
          if (structureWithGpt && extractedText.length > 0) {
            console.log(`[process-document-ocr] Structuring with GPT...`);
            provider = 'unpdf+gpt';
            
            const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                  {
                    role: 'system',
                    content: `Du er en assistent som strukturerer tekst ekstrahert fra dokumenter.
Oppgaven din er å:
1. Rydde opp i formateringen
2. Bevare all viktig informasjon
3. Bruke markdown-formatering for bedre lesbarhet
4. For tabeller, bruk markdown-tabeller
5. Identifiser nøkkelinformasjon som datoer, beløp, navn etc.

Returner kun den strukturerte teksten, ingen kommentarer.`
                  },
                  {
                    role: 'user',
                    content: `Strukturer følgende tekst fra et dokument:\n\n${extractedText.substring(0, 10000)}` // Limit to avoid token limits
                  }
                ],
                max_tokens: 4096,
                temperature: 0,
              }),
            });

            if (gptResponse.ok) {
              const gptData = await gptResponse.json();
              extractedText = gptData.choices[0]?.message?.content || extractedText;
            }
          }
        } catch (pdfError) {
          console.error('PDF parse error:', pdfError);
          throw new Error(`Kunne ikke lese PDF: ${pdfError.message}`);
        }
      } else {
        // ===== Image: Use OpenAI Vision =====
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are an OCR assistant. Extract ALL text from the provided image/document. 
Return ONLY the extracted text, preserving the original structure and formatting as much as possible.
For tables, use markdown table format.
For lists, use markdown list format.
Do not add any commentary or explanations - just the extracted text.`
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Extract all text from this document:'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${effectiveMimeType};base64,${imageBase64}`,
                      detail: 'high'
                    }
                  }
                ]
              }
            ],
            max_tokens: 4096,
            temperature: 0,
          }),
        });

        if (!openaiResponse.ok) {
          const errorText = await openaiResponse.text();
          console.error('OpenAI API error:', errorText);
          throw new Error(`OpenAI API error: ${openaiResponse.status}`);
        }

        const openaiData = await openaiResponse.json();
        extractedText = openaiData.choices[0]?.message?.content || '';
      }
      
      const confidence = extractedText.length > 50 ? 0.95 : extractedText.length > 10 ? 0.7 : 0.3;
      const processingTimeMs = Date.now() - startTime;

      console.log(`[process-document-ocr] Test mode completed - ${extractedText.length} chars in ${processingTimeMs}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          extractedText,
          confidence,
          provider,
          processingTimeMs,
        } as OCRResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // DOCUMENT MODE: Process from content_library
    // ============================================
    console.log(`[process-document-ocr] Starting OCR for document: ${documentId}`);

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: 'documentId is required (or use testMode with imageBase64)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Fetch document metadata
    const { data: document, error: docError } = await supabase
      .from('content_library')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error('Document not found:', docError);
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Check if already processed (unless force)
    if (!forceReprocess && document.ocr_status === 'completed') {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Document already processed',
          extractedText: document.extracted_text,
          confidence: document.ocr_confidence 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Check file type
    const supportedTypes = ['pdf', 'image', 'jpeg', 'jpg', 'png', 'gif', 'webp', 'tiff'];
    if (!supportedTypes.includes(document.file_type?.toLowerCase())) {
      // Skip OCR for text files
      await supabase
        .from('content_library')
        .update({ 
          ocr_status: 'skipped',
          ocr_processed_at: new Date().toISOString()
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'File type does not require OCR',
          skipped: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Update status to processing
    await supabase
      .from('content_library')
      .update({ ocr_status: 'processing' })
      .eq('id', documentId);

    // 5. Download file from storage
    const storagePath = document.file_storage_path;
    if (!storagePath) {
      throw new Error('No file storage path found');
    }

    console.log(`[process-document-ocr] Downloading from: ${storagePath}`);

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('project-documents')
      .download(storagePath);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`);
    }

    // 6. Convert to base64 for OpenAI Vision
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine MIME type for document
    let documentMimeType = 'image/png';
    const fileType = document.file_type?.toLowerCase();
    if (fileType === 'pdf') {
      // For PDF, we'd need to convert to image first - for MVP, just handle images
      // In production, use pdf-lib or similar to extract first page as image
      documentMimeType = 'application/pdf';
    } else if (fileType === 'jpeg' || fileType === 'jpg') {
      documentMimeType = 'image/jpeg';
    } else if (fileType === 'gif') {
      documentMimeType = 'image/gif';
    } else if (fileType === 'webp') {
      documentMimeType = 'image/webp';
    }

    // 7. Call OpenAI Vision API
    console.log(`[process-document-ocr] Calling OpenAI Vision API...`);

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an OCR assistant. Extract ALL text from the provided image/document. 
Return ONLY the extracted text, preserving the original structure and formatting as much as possible.
For tables, use markdown table format.
For lists, use markdown list format.
Do not add any commentary or explanations - just the extracted text.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this document:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${documentMimeType};base64,${base64}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        max_tokens: 4096,
        temperature: 0,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const extractedText = openaiData.choices[0]?.message?.content || '';
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // Calculate rough confidence based on response quality
    // (In production, could use more sophisticated metrics)
    const confidence = extractedText.length > 50 ? 0.95 : extractedText.length > 10 ? 0.7 : 0.3;

    console.log(`[process-document-ocr] Extracted ${extractedText.length} characters`);

    // 8. Update document with extracted text
    const { error: updateError } = await supabase
      .from('content_library')
      .update({
        extracted_text: extractedText,
        ocr_status: 'completed',
        ocr_confidence: confidence,
        ocr_provider: 'openai_vision',
        ocr_processed_at: new Date().toISOString(),
        ocr_error: null,
      })
      .eq('id', documentId);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    const processingTimeMs = Date.now() - startTime;

    const result: OCRResult = {
      success: true,
      extractedText,
      confidence,
      provider: 'openai_vision',
      processingTimeMs,
    };

    console.log(`[process-document-ocr] Completed in ${processingTimeMs}ms`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[process-document-ocr] Error:', error);

    // Try to update document with error status
    try {
      const body: RequestBody = await req.clone().json();
      if (body.documentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        await supabase
          .from('content_library')
          .update({
            ocr_status: 'failed',
            ocr_error: error.message,
            ocr_processed_at: new Date().toISOString(),
          })
          .eq('id', body.documentId);
      }
    } catch (e) {
      // Ignore update errors
    }

    const result: OCRResult = {
      success: false,
      error: error.message,
      provider: 'openai_vision',
      processingTimeMs: Date.now() - startTime,
    };

    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

