/**
 * AIImproveButton
 * 
 * A button component that triggers AI-powered text improvement.
 * Shows a dialog with side-by-side comparison of original and improved text.
 * 
 * Adapted from skattefunn-ai/AIAssistButton pattern.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Check, X, Copy, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AIImproveButtonProps {
  /** Current text to improve */
  currentText: string;
  /** Callback when user accepts the improved text */
  onAccept: (improvedText: string) => void;
  /** Function to generate improved text */
  onGenerate: (text: string) => Promise<string>;
  /** Button label */
  label?: string;
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Additional class names */
  className?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Dialog title */
  dialogTitle?: string;
  /** Dialog description */
  dialogDescription?: string;
  /** Minimum text length required */
  minLength?: number;
}

export function AIImproveButton({
  currentText,
  onAccept,
  onGenerate,
  label = 'Forbedre med AI',
  variant = 'outline',
  size = 'sm',
  className,
  disabled = false,
  dialogTitle = 'AI-forbedret tekst',
  dialogDescription = 'Sammenlign original og forbedret tekst. Du kan redigere før du godtar.',
  minLength = 10,
}: AIImproveButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [improvedText, setImprovedText] = useState('');
  const [editedText, setEditedText] = useState('');

  const handleClick = async () => {
    if (currentText.trim().length < minLength) {
      toast.error(`Skriv minst ${minLength} tegn før du forbedrer med AI`);
      return;
    }

    setIsGenerating(true);
    setIsOpen(true);

    try {
      const result = await onGenerate(currentText);
      setImprovedText(result);
      setEditedText(result);
    } catch (error) {
      console.error('AI improvement failed:', error);
      toast.error('Kunne ikke forbedre teksten');
      setIsOpen(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAccept = () => {
    onAccept(editedText);
    setIsOpen(false);
    setImprovedText('');
    setEditedText('');
    toast.success('Tekst oppdatert');
  };

  const handleCancel = () => {
    setIsOpen(false);
    setImprovedText('');
    setEditedText('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Kopiert til utklippstavle');
  };

  const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = (text: string) => text.length;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={disabled || isGenerating || currentText.trim().length < minLength}
        className={cn(className)}
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        )}
        {label}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {dialogTitle}
            </DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          {isGenerating ? (
            <div className="flex-1 flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Forbedrer teksten med AI...</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-2 gap-6">
                {/* Original text */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Original</Label>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {wordCount(currentText)} ord
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(currentText)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-h-[200px] max-h-[300px] overflow-auto p-4 bg-muted/50 rounded-lg border text-sm whitespace-pre-wrap">
                    {currentText}
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* Improved text (editable) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      Forbedret
                      <Sparkles className="h-3 w-3 text-primary" />
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={wordCount(editedText) > wordCount(currentText) ? 'default' : 'secondary'} 
                        className="text-xs"
                      >
                        {wordCount(editedText)} ord
                        {wordCount(editedText) !== wordCount(currentText) && (
                          <span className="ml-1">
                            ({wordCount(editedText) > wordCount(currentText) ? '+' : ''}
                            {wordCount(editedText) - wordCount(currentText)})
                          </span>
                        )}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(editedText)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="min-h-[200px] max-h-[300px] resize-none"
                    placeholder="AI-generert forslag..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Du kan redigere teksten før du godtar.
                  </p>
                </div>
              </div>

              {/* Character count comparison */}
              <div className="mt-4 flex items-center justify-center gap-8 text-xs text-muted-foreground">
                <span>Original: {charCount(currentText)} tegn</span>
                <span>→</span>
                <span>Forbedret: {charCount(editedText)} tegn</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex-shrink-0">
            <Button type="button" variant="outline" onClick={handleCancel}>
              <X className="h-4 w-4 mr-2" />
              Avbryt
            </Button>
            <Button 
              type="button" 
              onClick={handleAccept} 
              disabled={isGenerating || !editedText.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              Bruk denne teksten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

