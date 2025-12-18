require('dotenv').config();

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST ||'localhost',
      user: process.env.DB_USER||'root',
      password: process.env.DB_PASSWORD||'csense@25',
      database: process.env.DB_NAME ||'employee',
      port: process.env.DB_PORT
    },
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    }

    
  }

  
};

//console.log(process.env.DB_USER);  // Should print "root"
//console.log(process.env.DB_PASSWORD);  // Should print "password"
