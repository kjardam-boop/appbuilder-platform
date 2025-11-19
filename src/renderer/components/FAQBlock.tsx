import React from 'react';
import { FAQBlock as FAQBlockType } from '../schemas/experience.schema';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface FAQBlockProps {
  block: FAQBlockType;
}

export const FAQBlock: React.FC<FAQBlockProps> = ({ block }) => {
  return (
    <div className="py-12">
      {block.headline && (
        <h2 className="text-3xl font-bold text-center mb-12">{block.headline}</h2>
      )}

      <div className="max-w-3xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          {block.items.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
