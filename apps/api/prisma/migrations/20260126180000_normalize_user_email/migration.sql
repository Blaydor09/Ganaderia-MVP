-- Normalize user emails to lowercase for consistent uniqueness
UPDATE "User" SET "email" = LOWER("email");
