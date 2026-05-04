package com.rigoomarine.client.mail;

public interface MailSender {
    void send(String to, String subject, String body);
}
