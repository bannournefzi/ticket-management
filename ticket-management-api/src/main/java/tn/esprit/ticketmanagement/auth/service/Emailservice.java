package tn.esprit.ticketmanagement.auth.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import tn.esprit.ticketmanagement.auth.email.EmailTemplateName;

import java.util.HashMap;
import java.util.Map;

import static java.nio.charset.StandardCharsets.UTF_8;
import static org.springframework.mail.javamail.MimeMessageHelper.MULTIPART_MODE_MIXED;

@Service
@RequiredArgsConstructor
public class Emailservice {
    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;


    @Async


    public void sendEmail(
            String to ,
            String username,
            EmailTemplateName emailTemplateName,
            String confirmationUrl,
            String activationCode,
            String subject

    ) throws MessagingException{
        String templateName;
        if(emailTemplateName== null){
            templateName = "confirm-email";
        }else {
            templateName = emailTemplateName.name();
        }
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                MULTIPART_MODE_MIXED,
                UTF_8.name()
        );
        Map<String,Object> properties = new HashMap<>();
        properties.put("username",username);
        properties.put("confirmationUrl",confirmationUrl);
        properties.put("activation_code",activationCode);

        Context context = new Context();
        context.setVariables(properties);

        helper.setFrom("contact@nefzibannour.com");
        helper.setTo(to);
        helper.setSubject(subject);

        String template = templateEngine.process(templateName,context);

        helper.setText(template,true);

        mailSender.send(mimeMessage);



    }
    @Async
    public void sendWelcomeEmail(
            String toEmail,
            String firstName,
            String lastName,
            String password,
            String roleName
    ) throws MessagingException {

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                MULTIPART_MODE_MIXED,
                UTF_8.name()
        );

        // Préparer les variables pour le template
        Map<String, Object> properties = new HashMap<>();
        properties.put("firstName", firstName);
        properties.put("lastName", lastName);
        properties.put("email", toEmail);
        properties.put("password", password);
        properties.put("role", roleName.replace("ROLE_", ""));
        properties.put("roleName", roleName);
        properties.put("loginUrl", "http://localhost:4200/login");

        Context context = new Context();
        context.setVariables(properties);

        helper.setFrom("contact@nefzibannour.com");
        helper.setTo(toEmail);
        helper.setSubject("Bienvenue sur Ticket Management - Vos identifiants de connexion");

        // Utiliser le template Thymeleaf
        String template = templateEngine.process("welcome-email", context);
        helper.setText(template, true);

        mailSender.send(mimeMessage);
    }

    @Async
    public void sendPasswordResetEmail(
            String toEmail,
            String firstName,
            String resetLink
    ) throws MessagingException {

        MimeMessage mimeMessage = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                mimeMessage,
                MULTIPART_MODE_MIXED,
                UTF_8.name()
        );

        Map<String, Object> properties = new HashMap<>();
        properties.put("firstName", firstName);
        properties.put("resetLink", resetLink);

        Context context = new Context();
        context.setVariables(properties);

        helper.setFrom("contact@nefzibannour.com");
        helper.setTo(toEmail);
        helper.setSubject("Réinitialisation de votre mot de passe – Ticket Management");

        String template = templateEngine.process("reset-password", context);
        helper.setText(template, true);

        mailSender.send(mimeMessage);
    }
}
