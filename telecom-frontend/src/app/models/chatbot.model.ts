export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatbotRequest {
  message: string;
}

export interface ChatbotResponse {
  response: string;
}