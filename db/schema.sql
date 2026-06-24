CREATE TABLE users (
  id          CHAR(36)      NOT NULL PRIMARY KEY,
  email       VARCHAR(255)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,
  public_key  TEXT,
  verified    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conversations (
  id              CHAR(36)      NOT NULL PRIMARY KEY,
  user_a          CHAR(36)      NOT NULL,
  user_b          CHAR(36)      NOT NULL,
  contact_name_a  VARCHAR(255)  NULL DEFAULT NULL,
  contact_name_b  VARCHAR(255)  NULL DEFAULT NULL,
  blocked_by_a    BOOLEAN       NOT NULL DEFAULT FALSE,
  blocked_by_b    BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_a) REFERENCES users(id),
  FOREIGN KEY (user_b) REFERENCES users(id),
  UNIQUE KEY unique_pair (user_a, user_b)
);

CREATE TABLE verification_tokens (
  token       CHAR(64)      NOT NULL PRIMARY KEY,
  user_id     CHAR(36)      NOT NULL,
  expires_at  DATETIME      NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE push_subscriptions (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  user_id       CHAR(36)      NOT NULL,
  endpoint      TEXT          NOT NULL,
  p256dh_key    TEXT          NOT NULL,
  auth_key      TEXT          NOT NULL,
  device_label  VARCHAR(100),
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE pending_messages (
  message_id   CHAR(36)      NOT NULL PRIMARY KEY,
  from_user_id CHAR(36)      NOT NULL,
  to_user_id   CHAR(36)      NOT NULL,
  payload      TEXT          NOT NULL,
  sent_at      BIGINT        NOT NULL,
  expires_at   DATETIME      NOT NULL,
  INDEX idx_to_user  (to_user_id),
  INDEX idx_expires  (expires_at),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id)   REFERENCES users(id)
);

CREATE TABLE message_tombstones (
  id               CHAR(36)      NOT NULL PRIMARY KEY,
  conversation_id  CHAR(36)      NOT NULL,
  sender_id        CHAR(36)      NOT NULL,
  sent_at          DATETIME      NOT NULL,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id),
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE invites (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  inviter_id   CHAR(36)      NOT NULL,
  email        VARCHAR(255)  NOT NULL,
  token        CHAR(64)      NOT NULL UNIQUE,
  sent_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at  DATETIME      NULL DEFAULT NULL,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_inviter (inviter_id),
  INDEX idx_token   (token),
  INDEX idx_email   (email)
);
