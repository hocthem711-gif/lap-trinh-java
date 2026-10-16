package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.Email;

public class UpdateUserRequest {

    private String fullName;

    @Email(message = "Email không đúng định dạng")
    private String email;

    private String password;

    private Boolean active;

    public UpdateUserRequest() {}

    public UpdateUserRequest(String fullName, String email, String password, Boolean active) {
        this.fullName = fullName;
        this.email = email;
        this.password = password;
        this.active = active;
    }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
