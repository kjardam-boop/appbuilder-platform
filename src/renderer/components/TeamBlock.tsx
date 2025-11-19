import React, { useState } from 'react';
import { TeamBlock as TeamBlockType } from '../schemas/experience.schema';
import { Mail, Linkedin, Twitter, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const needsReadMore = (text: string, maxLength: number = 100) => {
    return text.length > maxLength;
  };

  return (
    <div className="py-8 md:py-12 w-full">
      <div className="text-center mb-8 md:mb-12 px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{block.headline}</h2>
        {block.description && (
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            {block.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 w-full">
        {block.members.map((member, idx) => {
          const showReadMore = member.bio && needsReadMore(member.bio);
          
          return (
            <div
              key={idx}
              className="group bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-all text-center w-full"
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
                  <div className="w-full">
                    <div className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none">
                      <ReactMarkdown>
                        {showReadMore ? truncateText(member.bio) : member.bio}
                      </ReactMarkdown>
                    </div>
                    {showReadMore && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-primary hover:underline"
                          >
                            Les mer...
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <div className="flex flex-col items-center gap-4 mb-4">
                              <Avatar className="h-24 w-24 ring-2 ring-primary/20">
                                <AvatarImage src={member.image} alt={member.name} />
                                <AvatarFallback className="text-2xl font-semibold bg-primary/10 text-primary">
                                  {getInitials(member.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-center space-y-2">
                                <DialogTitle className="text-xl">{member.name}</DialogTitle>
                                <Badge variant="secondary">{member.role}</Badge>
                              </div>
                            </div>
                          </DialogHeader>
                          <div className="prose prose-sm max-w-none text-muted-foreground">
                            <ReactMarkdown>{member.bio}</ReactMarkdown>
                          </div>
                          {/* Social links in dialog */}
                          {member.social && (
                            <div className="flex justify-center gap-4 mt-6 pt-6 border-t">
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
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
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
          );
        })}
      </div>
    </div>
  );
};
