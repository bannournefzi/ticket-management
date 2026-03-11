package tn.esprit.ticketmanagement.auth.dto;

import lombok.*;

@Getter
@Setter
@Builder

public class AuthenticationResponse {

    private String token;
}

