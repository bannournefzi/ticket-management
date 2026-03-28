package tn.esprit.ticketmanagement.ai_voice;

public class VoiceToTicketRequest {

    private String text;
    private String language;

    public VoiceToTicketRequest() {}

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}