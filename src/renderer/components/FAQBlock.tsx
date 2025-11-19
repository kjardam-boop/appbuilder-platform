import React from 'react';
import { FAQBlock as FAQBlockType } from '../schemas/experience.schema';
import ReactMarkdown from 'react-markdown';
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
    <div className="py-8 md:py-12 w-full">
      {block.headline && (
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 px-4">{block.headline}</h2>
      )}

      <div className="max-w-3xl mx-auto w-full px-4">
        <Accordion type="single" collapsible className="w-full">
          {block.items.map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`}>
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="font-semibold">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground prose prose-sm max-w-none">
                <ReactMarkdown>{item.answer}</ReactMarkdown>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
