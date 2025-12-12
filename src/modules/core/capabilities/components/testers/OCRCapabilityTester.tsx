/**
 * OCRCapabilityTester
 * 
 * Test component for OCR capability.
 * Allows uploading an image and seeing the extracted text.
 * Supports routing output to configured destinations.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  Image, 
  FileText, 
  FileSpreadsheet,
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Trash2,
  Send
} from 'lucide-react';
import { DestinationSelector } from '../DestinationSelector';
import { DestinationService } from '../../services/destinationService';
import type { DestinationType } from '../../types/capability.types';

interface OCRCapabilityTesterProps {
  config: Record<string, unknown>;
  capabilityId?: string;
}

interface OCRResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  provider: string;
  processingTimeMs: number;
}

// Supported file types:
// - PDF: unpdf + GPT for text extraction
// - Images: OpenAI Vision API
// - Excel/CSV: SheetJS + GPT for parsing
const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/csv': ['.csv'],
};

export function OCRCapabilityTester({ config, capabilityId }: OCRCapabilityTesterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [destination, setDestination] = useState<{
    type: DestinationType | null;
    id: string | null;
    url?: string | null;
  }>({ type: null, id: null });
  const [isSendingToDestination, setIsSendingToDestination] = useState(false);

  const maxFileSizeMB = (config.maxFileSizeMB as number) || 10;
  const maxFileSize = maxFileSizeMB * 1024 * 1024;

  // OCR processing mutation
  const ocrMutation = useMutation({
    mutationFn: async (file: File): Promise<OCRResult> => {
      // Convert file to base64
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // Use file's MIME type directly
      const mimeType = file.type || 'application/octet-stream';

      // Call edge function with test mode
      const { data, error } = await supabase.functions.invoke('process-document-ocr', {
        body: {
          testMode: true,
          imageBase64: base64,
          mimeType,
          config, // Pass current test config
        },
      });

      if (error) throw error;
      return data as OCRResult;
    },
    onSuccess: (data) => {
      setResult(data);
      if (data.success) {
        toast.success('OCR fullført', {
          description: `${data.extractedText?.length || 0} tegn ekstrahert på ${data.processingTimeMs}ms`,
        });
      } else {
        toast.error('OCR feilet', { description: data.error });
      }
    },
    onError: (error) => {
      toast.error('OCR feilet', { description: error.message });
      setResult({
        success: false,
        error: error.message,
        provider: 'unknown',
        processingTimeMs: 0,
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > maxFileSize) {
      toast.error(`Fil for stor. Maks ${maxFileSizeMB}MB.`);
      return;
    }

    setSelectedFile(file);
    setResult(null);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [maxFileSize, maxFileSizeMB]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: maxFileSize,
    noClick: false,
    noKeyboard: false,
    // Enable native file drag
    useFsAccessApi: false,
  });

  const handleProcess = () => {
    if (selectedFile) {
      ocrMutation.mutate(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreview(null);
    setResult(null);
  };

  const handleCopyText = () => {
    if (result?.extractedText) {
      navigator.clipboard.writeText(result.extractedText);
      toast.success('Tekst kopiert til utklippstavle');
    }
  };

  // Send result to selected destination
  const handleSendToDestination = async () => {
    if (!result?.extractedText || !destination.type) return;

    setIsSendingToDestination(true);
    try {
      const sendResult = await DestinationService.sendToDestination(
        {
          id: destination.id || 'custom-webhook',
          source_capability_id: capabilityId || '',
          destination_type: destination.type,
          destination_id: destination.id,
          destination_url: destination.url || null,
          config: {},
          priority: 0,
          is_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          extractedText: result.extractedText,
          confidence: result.confidence,
          provider: result.provider,
          processingTimeMs: result.processingTimeMs,
          fileName: selectedFile?.name,
          fileType: selectedFile?.type,
        }
      );

      if (sendResult.success) {
        toast.success('Resultat sendt til destinasjon');
      } else {
        toast.error('Kunne ikke sende til destinasjon', { 
          description: sendResult.error 
        });
      }
    } catch (error) {
      toast.error('Feil ved sending', { 
        description: error instanceof Error ? error.message : 'Ukjent feil' 
      });
    } finally {
      setIsSendingToDestination(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps({
          onClick: (e) => {
            // Don't block click - let it open file dialog
          },
          onDragOver: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
          onDragEnter: (e) => {
            e.preventDefault();
            e.stopPropagation();
          },
        })}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all",
          isDragActive && "border-primary bg-primary/5 scale-[1.02]",
          selectedFile && "border-green-500 bg-green-50 dark:bg-green-950/20",
          !isDragActive && !selectedFile && "hover:border-primary/50 hover:bg-muted/50"
        )}
        role="button"
        tabIndex={0}
        aria-label="Klikk eller dra fil for å laste opp"
      >
        <input {...getInputProps()} aria-label="Fil-opplasting" />
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="h-16 w-16 object-cover rounded"
              />
            ) : selectedFile.type.includes('spreadsheet') || 
                 selectedFile.type.includes('excel') || 
                 selectedFile.type === 'text/csv' ||
                 selectedFile.name.endsWith('.xlsx') ||
                 selectedFile.name.endsWith('.xls') ||
                 selectedFile.name.endsWith('.csv') ? (
              <FileSpreadsheet className="h-12 w-12 text-green-600" />
            ) : (
              <FileText className="h-12 w-12 text-muted-foreground" />
            )}
            <div className="text-left">
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        ) : (
          <>
            <Image className={cn(
              "h-10 w-10 mx-auto mb-3",
              isDragActive ? "text-primary" : "text-muted-foreground"
            )} />
            {isDragActive ? (
              <p className="text-primary font-medium">Slipp filen her...</p>
            ) : (
              <>
                <p className="font-medium mb-1">Dra og slipp fil her, eller klikk for å velge</p>
                <p className="text-sm text-muted-foreground">
                  PDF, bilder (JPG, PNG, GIF, WebP), Excel eller CSV (maks {maxFileSizeMB}MB)
                </p>
              </>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {selectedFile && (
        <div className="flex gap-2">
          <Button 
            onClick={handleProcess} 
            disabled={ocrMutation.isPending}
            className="flex-1"
          >
            {ocrMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Prosesserer...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Kjør OCR
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Progress indicator */}
      {ocrMutation.isPending && (
        <div className="space-y-2">
          <Progress value={66} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Sender til {(config.provider as string) || 'OpenAI Vision'}...
          </p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={cn(
          "rounded-lg border p-4 space-y-3",
          result.success ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"
        )}>
          {/* Status header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className="font-medium">
                {result.success ? 'OCR Fullført' : 'OCR Feilet'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {result.confidence && (
                <Badge variant="secondary">
                  {Math.round(result.confidence * 100)}% sikkerhet
                </Badge>
              )}
              <Badge variant="outline">{result.provider}</Badge>
              <Badge variant="outline">{result.processingTimeMs}ms</Badge>
            </div>
          </div>

          {/* Extracted text or error */}
          {result.success && result.extractedText ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Ekstrahert tekst ({result.extractedText.length} tegn):
                </span>
                <Button variant="ghost" size="sm" onClick={handleCopyText}>
                  <Copy className="h-4 w-4 mr-1" />
                  Kopier
                </Button>
              </div>
              <Textarea
                value={result.extractedText}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          ) : result.error ? (
            <p className="text-red-600 text-sm">{result.error}</p>
          ) : null}
        </div>
      )}

      {/* Destination Selector */}
      {capabilityId && (
        <>
          <Separator className="my-4" />
          <DestinationSelector
            capabilityId={capabilityId}
            outputTypes={['text', 'json']}
            value={destination}
            onChange={setDestination}
            disabled={ocrMutation.isPending || isSendingToDestination}
          />
        </>
      )}

      {/* Send to Destination Button */}
      {result?.success && destination.type && (
        <Button
          onClick={handleSendToDestination}
          disabled={isSendingToDestination || !result?.extractedText}
          variant="secondary"
          className="w-full"
        >
          {isSendingToDestination ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sender...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send til {destination.type === 'webhook' ? 'webhook' : 'destinasjon'}
            </>
          )}
        </Button>
      )}

      {/* Config info */}
      <div className="text-xs text-muted-foreground bg-muted/50 rounded p-3">
        <p className="font-medium mb-1">Aktiv konfigurasjon:</p>
        <ul className="space-y-0.5">
          <li>• Provider: {(config.provider as string) || 'openai_vision'}</li>
          <li>• Maks filstørrelse: {maxFileSizeMB}MB</li>
          <li>• Språk: {((config.supportedLanguages as string[]) || ['no', 'en']).join(', ')}</li>
        </ul>
      </div>
    </div>
  );
}

