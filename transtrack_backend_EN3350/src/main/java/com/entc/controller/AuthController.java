package com.entc.controller;

import com.entc.model.User;
import com.entc.repo.UserRepository;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*") // keep simple for now
public class AuthController {

  private final UserRepository users;

  public AuthController(UserRepository users) {
    this.users = users;
  }

  public static record LoginReq(@NotBlank String username, @NotBlank String password) {}
  public static record LoginRes(Long id, String username) {}
  public static record Msg(String message) {}

  @PostMapping("/register")
  public ResponseEntity<?> register(@RequestBody LoginReq body) {
    if (users.existsByUsername(body.username())) {
      return ResponseEntity.badRequest().body(new Msg("Username already exists"));
    }
    // PLAIN TEXT by request
    User u = users.save(new User(body.username(), body.password()));
    return ResponseEntity.ok(new LoginRes(u.getId(), u.getUsername()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@RequestBody LoginReq body) {
    return users.findByUsername(body.username())
      .filter(u -> u.getPassword().equals(body.password()))
      .<ResponseEntity<?>>map(u -> ResponseEntity.ok(new LoginRes(u.getId(), u.getUsername())))
      .orElseGet(() -> ResponseEntity.status(401).body(new Msg("Invalid credentials")));
  }
}
