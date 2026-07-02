package com.rigoomarine.notification.mail;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailConfig {
    private boolean enabled;
    private String host;
    private int port;
    private String username;
    private String password;
    private String from;

    public boolean isValid() {
        return host != null && !host.isBlank()
            && username != null && !username.isBlank()
            && password != null && !password.isBlank();
    }
}
