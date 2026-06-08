package tn.esprit.ticketmanagement.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import tn.esprit.ticketmanagement.interceptor.UserSynchronizerFilter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.springframework.security.config.Customizer.withDefaults;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(securedEnabled = true)
public class SecurityConfig {

    private final AuthenticationProvider authenticationProvider;
    private final JwtFilter jwtAuthFilter;
    private final UserSynchronizerFilter userSynchronizerFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(req ->
                        req
                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                                // Truly public — no login needed
                                .requestMatchers(
                                        "/auth/**",
                                        "/api/v1/auth/**",
                                        "/payments/webhook",
                                        "/payments/confirm",
                                        "/ws/**",
                                        "/messages/media/**",
                                        "/v3/api-docs",
                                        "/v3/api-docs/**",
                                        "/swagger-ui/**",
                                        "/swagger-ui.html",
                                        "/swagger-resources/**",
                                        "/actuator/**",
                                        "/chatbot/**"
                                ).permitAll()

                                // Any logged-in user
                                .requestMatchers("/ai/**").authenticated()
                                .requestMatchers("/notifications/**").authenticated()

                                // Settings — read for all, write for ADMIN only
                                .requestMatchers(HttpMethod.GET, "/settings/**").authenticated()
                                .requestMatchers(HttpMethod.PUT, "/settings/**").hasRole("ADMIN")
                                .requestMatchers(HttpMethod.POST, "/settings/**").hasRole("ADMIN")
                                .requestMatchers(HttpMethod.DELETE, "/settings/**").hasRole("ADMIN")
                                .requestMatchers(HttpMethod.PATCH, "/settings/**").hasRole("ADMIN")

                                //  Role-specific
                                .requestMatchers("/admin/permissions/**").hasRole("ADMIN")
                                .requestMatchers("/user/permissions/my-pages").authenticated()
                                .requestMatchers("/audit/admin/**").hasRole("ADMIN")
                                .requestMatchers("/audit/my-history").authenticated()

                                .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
                .authenticationProvider(authenticationProvider)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOriginPatterns(List.of("http://localhost:*"));
        configuration.setAllowedMethods(List.of("*"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }

}
