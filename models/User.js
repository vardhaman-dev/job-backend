// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/database');
// const bcrypt = require('bcryptjs');

// // Define the User model
// const User = sequelize.define('User', {
//   id: {
//     type: DataTypes.INTEGER,
//     primaryKey: true,
//     autoIncrement: true,
//   },
//   email: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: {
//       msg: 'Email already in use',
//     },
//     validate: {
//       isEmail: {
//         msg: 'Please provide a valid email address',
//       },
//       notEmpty: {
//         msg: 'Email is required',
//       },
//     },
//   },
//   password_hash: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     validate: {
//       notEmpty: {
//         msg: 'Password is required',
//       },
//     },
//   },
//   name: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     validate: {
//       notEmpty: {
//         msg: 'Name is required',
//       },
//       len: {
//         args: [2, 100],
//         msg: 'Name must be between 2 and 100 characters',
//       },
//     },
//   },
//   role: {
//     type: DataTypes.ENUM('job_seeker', 'company', 'admin'),
//     allowNull: false,
//     defaultValue: 'job_seeker',
//     validate: {
//       isIn: {
//         args: [['job_seeker', 'company', 'admin']],
//         msg: 'Invalid role specified',
//       },
//     },
//   },
//   status: {
//     type: DataTypes.ENUM('active', 'inactive', 'banned'),
//     allowNull: false,
//     defaultValue: 'active',
//     validate: {
//       isIn: {
//         args: [['active', 'inactive', 'banned']],
//         msg: 'Invalid status specified',
//       },
//     },
//   },
//   lastLogin: { // New field
//     type: DataTypes.DATE,
//     allowNull: true,
//     defaultValue: null,
//   },
// },
// {
//   tableName: 'users',
//   timestamps: false, // Disable timestamps to match database schema
//   underscored: true,
//   defaultScope: {
//     attributes: {
//       exclude: ['password_hash'],
//     },
//   },
//   scopes: {
//     withPassword: {
//       attributes: { include: ['password_hash'] },
//     },
//   },
// });

// /**
//  * Instance method to validate a password
//  * @param {string} password - The password to validate
//  * @returns {Promise<boolean>} True if password is valid, false otherwise
//  */
// User.prototype.validPassword = async function(password) {
//   if (!password || !this.password_hash) {
//     console.error('Password or hash is missing');
//     return false;
//   }
  
//   try {
//     return await bcrypt.compare(password, this.password_hash);
//   } catch (error) {
//     console.error('Error validating password:', error);
//     return false;
//   }
// };

// // Hash password before saving
// User.beforeSave(async (user, options) => {
//   // Prevent setting role to 'admin' through normal user creation/update
//   if (user.role === 'admin' && (!options || !options.isAdminCreation)) {
//     throw new Error('Admin role cannot be assigned through this operation');
//   }
  
//   if (user.changed('password_hash')) {
//     const salt = await bcrypt.genSalt(10);
//     user.password_hash = await bcrypt.hash(user.password_hash, salt);
//   }
// });

// /**
//  * Static method to create an admin user (only for internal/direct DB use)
//  * This should only be used in secure contexts (migrations, seeds, or direct DB operations)
//  */
// User.createAdmin = async function(adminData) {
//   return this.create({
//     ...adminData,
//     role: 'admin',
//     status: 'active'
//   }, { isAdminCreation: true });
// };

// // Hook to ensure email is lowercase and trim whitespace
// User.beforeValidate((user, options) => {
//   if (user.email) {
//     user.email = user.email.toLowerCase().trim();
//   }
//   if (user.name) {
//     user.name = user.name.trim();
//   }
// });

// module.exports = User;

// models/User.js
const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    async validPassword(password) {
      if (!password || !this.password_hash) {
        console.error('Password or hash is missing');
        throw new Error('Password or hash is missing');
      }
      try {
        return await bcrypt.compare(password, this.password_hash);
      } catch (error) {
        console.error('Error validating password:', error);
        throw error; // Propagate error for better debugging
      }
    }
  }

  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: {
          msg: 'Email already in use',
        },
        validate: {
          isEmail: {
            msg: 'Please provide a valid email address',
          },
          notEmpty: {
            msg: 'Email is required',
          },
        },
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Password is required',
          },
        },
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Name is required',
          },
          len: {
            args: [2, 100],
            msg: 'Name must be between 2 and 100 characters',
          },
        },
      },
      role: {
        type: DataTypes.ENUM('job_seeker', 'company', 'admin'),
        allowNull: false,
        defaultValue: 'job_seeker',
        validate: {
          isIn: {
            args: [['job_seeker', 'company', 'admin']],
            msg: 'Invalid role specified',
          },
        },
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          isIn: {
            args: [['active', 'inactive', 'banned']],
            msg: 'Invalid status specified',
          },
        },
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },
    },
    {
      sequelize,
      modelName: 'User',
      tableName: 'users',
      timestamps: false,
      underscored: true,
      defaultScope: {
        attributes: {
          exclude: ['password_hash'],
        },
      },
      scopes: {
        withPassword: {
          attributes: { include: ['password_hash'] },
        },
      },
    }
  );

  // Hash password before saving
  User.beforeSave(async (user, options) => {
    if (user.role === 'admin' && (!options || !options.isAdminCreation)) {
      throw new Error('Admin role cannot be assigned through this operation');
    }

    if (user.changed('password_hash') && !user.password_hash.startsWith('$2a$')) {
      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(user.password_hash, salt);
    }
  });

  // Hook to normalize email and name
  User.beforeValidate((user) => {
    if (user.email) {
      user.email = user.email.toLowerCase().trim();
    }
    if (user.name) {
      user.name = user.name.trim();
    }
  });

  // Static method to create an admin user
  User.createAdmin = async function (adminData) {
    return this.create(
      {
        ...adminData,
        role: 'admin',
        status: 'active',
      },
      { isAdminCreation: true }
    );
  };

  return User;
};