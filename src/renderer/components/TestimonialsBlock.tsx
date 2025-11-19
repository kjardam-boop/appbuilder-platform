import React from 'react';
import { TestimonialsBlock as TestimonialsBlockType } from '../schemas/experience.schema';
import { Quote } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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

  return (
    <div className="py-12">
      {block.headline && (
        <h2 className="text-3xl font-bold text-center mb-12">{block.headline}</h2>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {block.items.map((testimonial, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow relative"
          >
            <Quote className="w-8 h-8 text-primary/20 mb-4" />
            
            <p className="text-muted-foreground mb-6 italic">
              "{testimonial.quote}"
            </p>
            
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
        ))}
      </div>
    </div>
  );
};
