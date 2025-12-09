/**
 * OCRCapabilityTester
 * 
 * Test component for OCR capability.
 * Allows uploading an image and seeing the extracted text.
 */

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  Upload, 
  Image, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Copy,
  Trash2
} from 'lucide-react';

interface OCRCapabilityTesterProps {
  config: Record<string, unknown>;
}

interface OCRResult {
  success: boolean;
  extractedText?: string;
  confidence?: number;
  error?: string;
  provider: string;
  processingTimeMs: number;
}

// PDF: Uses pdf-parse + GPT for text extraction
// Images: Uses OpenAI Vision API
const ACCEPTED_FILE_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

export function OCRCapabilityTester({ config }: OCRCapabilityTesterProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    maxSize: maxFileSize,
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

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          selectedFile && "border-green-500 bg-green-50 dark:bg-green-950/20",
          "hover:border-primary/50"
        )}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            {preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="h-16 w-16 object-cover rounded"
              />
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
              <p className="text-primary font-medium">Slipp bildet her...</p>
            ) : (
              <>
                <p className="font-medium mb-1">Dra og slipp bilde her</p>
                <p className="text-sm text-muted-foreground">
                  PDF, JPG, PNG, GIF eller WebP (maks {maxFileSizeMB}MB)
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

