import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({ name: 'chatFormat' })
export class ChatFormatPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    const formatted = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')    
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                 
      .replace(/^•\s/gm, '&bull; ')                        
      .replace(/\n/g, '<br>');                              
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}