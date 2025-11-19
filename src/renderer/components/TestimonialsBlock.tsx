import React from 'react';
import { TestimonialsBlock as TestimonialsBlockType } from '../schemas/experience.schema';
import { Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface TestimonialsBlockProps {
  block: TestimonialsBlockType;
}

export const TestimonialsBlock: React.FC<TestimonialsBlockProps> = ({ block }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const needsReadMore = (text: string, maxLength: number = 150) => {
    return text.length > maxLength;
  };

  return (
    <div className="py-8 md:py-12 w-full">
      {block.headline && (
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 px-4">{block.headline}</h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
        {block.items.map((testimonial, idx) => {
          const showReadMore = needsReadMore(testimonial.quote);
          
          return (
            <div
              key={idx}
              className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow relative w-full"
            >
              <Quote className="w-8 h-8 text-primary/20 mb-4" />
              
              <div className="text-muted-foreground mb-6 italic prose prose-sm max-w-none">
                <ReactMarkdown>
                  {`"${showReadMore ? truncateText(testimonial.quote) : testimonial.quote}"`}
                </ReactMarkdown>
              </div>

              {showReadMore && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-4 text-primary hover:underline px-0"
                    >
                      Les mer...
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <Quote className="w-12 h-12 text-primary/20 mb-4" />
                    </DialogHeader>
                    <div className="prose prose-sm max-w-none text-muted-foreground italic mb-6">
                      <ReactMarkdown>{`"${testimonial.quote}"`}</ReactMarkdown>
                    </div>
                    <div className="flex items-center gap-4 pt-6 border-t">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={testimonial.image} alt={testimonial.author} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(testimonial.author)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle className="font-semibold">{testimonial.author}</DialogTitle>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role}
                          {testimonial.company && `, ${testimonial.company}`}
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={testimonial.image} alt={testimonial.author} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(testimonial.author)}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.role}
                    {testimonial.company && `, ${testimonial.company}`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
