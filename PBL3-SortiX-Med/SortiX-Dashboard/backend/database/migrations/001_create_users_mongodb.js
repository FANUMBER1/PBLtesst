// ============================================================================
// Migration: 001_create_users_mongodb.js
// Description: Collection creation script with JSON Schema Validation
//              and Indexes for MongoDB & Mongoose Schema.
// ============================================================================

// 1. Mongosh / MongoDB Native Script
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["username", "full_name", "email", "password_hash", "role", "status", "created_at", "updated_at"],
      properties: {
        username: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9_.-]{3,50}$",
          description: "Unique username 3-50 chars"
        },
        full_name: {
          bsonType: "string",
          minLength: 2,
          maxLength: 100,
          description: "Display name"
        },
        email: {
          bsonType: "string",
          pattern: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
          description: "Unique email address"
        },
        password_hash: {
          bsonType: "string",
          description: "Bcrypt or Argon2 hash string"
        },
        role: {
          enum: ["admin", "user"],
          description: "User role: admin or user"
        },
        status: {
          enum: ["active", "locked"],
          description: "Account status: active or locked"
        },
        created_at: {
          bsonType: "date"
        },
        updated_at: {
          bsonType: "date"
        }
      }
    }
  }
});

// Create Unique & Composite Indexes
db.users.createIndex({ username: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
db.users.createIndex({ email: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });
db.users.createIndex({ role: 1, status: 1 });

/**
 * 2. Mongoose Schema Reference (if using Mongoose ODM in Node.js)
 * 
 * const mongoose = require("mongoose");
 * 
 * const UserSchema = new mongoose.Schema({
 *   username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 50 },
 *   full_name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
 *   email: { type: String, required: true, unique: true, lowercase: true, trim: true },
 *   password_hash: { type: String, required: true },
 *   role: { type: String, enum: ["admin", "user"], default: "user", required: true },
 *   status: { type: String, enum: ["active", "locked"], default: "active", required: true },
 * }, {
 *   timestamps: { createdAt: "created_at", updatedAt: "updated_at" }
 * });
 * 
 * module.exports = mongoose.model("User", UserSchema);
 */
