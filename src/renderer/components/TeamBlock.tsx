import React from 'react';
import { TeamBlock as TeamBlockType } from '../schemas/experience.schema';
import { Linkedin, Twitter, Mail } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TeamBlockProps {
  block: TeamBlockType;
}

export const TeamBlock: React.FC<TeamBlockProps> = ({ block }) => {
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
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">{block.headline}</h2>
        {block.description && (
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {block.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {block.members.map((member, idx) => (
          <div
            key={idx}
            className="bg-card border border-border rounded-lg p-6 text-center hover:shadow-lg transition-shadow"
          >
            <Avatar className="w-24 h-24 mx-auto mb-4">
              <AvatarImage src={member.image} alt={member.name} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
            
            <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
            <p className="text-sm text-primary font-medium mb-3">{member.role}</p>
            
            {member.bio && (
              <p className="text-sm text-muted-foreground mb-4">{member.bio}</p>
            )}
            
            {member.social && (
              <div className="flex items-center justify-center gap-3">
                {member.social.linkedin && (
                  <a
                    href={member.social.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Linkedin className="w-5 h-5" />
                  </a>
                )}
                {member.social.twitter && (
                  <a
                    href={member.social.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {member.social.email && (
                  <a
                    href={`mailto:${member.social.email}`}
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
