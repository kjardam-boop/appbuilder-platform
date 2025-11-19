import React from 'react';
import { TeamBlock as TeamBlockType } from '../schemas/experience.schema';
import { Mail, Linkedin, Twitter, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
            className="group bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all text-center"
          >
            <div className="flex flex-col items-center gap-4">
              {/* Avatar with ring effect */}
              <Avatar className="h-24 w-24 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                <AvatarImage src={member.image} alt={member.name} />
                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>

              {/* Name and role */}
              <div className="space-y-2">
                <h3 className="text-xl font-bold">{member.name}</h3>
                <Badge variant="secondary" className="text-sm">
                  {member.role}
                </Badge>
              </div>

              {/* Bio */}
              {member.bio && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {member.bio}
                </p>
              )}

              {/* Social links */}
              {member.social && (
                <div className="flex gap-3 mt-2">
                  {member.social.email && (
                    <a
                      href={`mailto:${member.social.email}`}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Send e-post"
                    >
                      <Mail className="h-5 w-5" />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a
                      href={member.social.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="LinkedIn"
                    >
                      <Linkedin className="h-5 w-5" />
                    </a>
                  )}
                  {member.social.twitter && (
                    <a
                      href={member.social.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Twitter/X"
                    >
                      <Twitter className="h-5 w-5" />
                    </a>
                  )}
                  {member.social.website && (
                    <a
                      href={member.social.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Nettside"
                    >
                      <Globe className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
