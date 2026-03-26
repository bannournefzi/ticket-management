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
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')   // **bold**
      .replace(/\*(.*?)\*/g, '<em>$1</em>')                // *italic*
      .replace(/^•\s/gm, '&bull; ')                        // bullet points
      .replace(/\n/g, '<br>');                             // newlines
    return this.sanitizer.bypassSecurityTrustHtml(formatted);
  }
}