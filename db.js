const { Pool } = require('pg');
const pool = new Pool({
   connectionString: "postgresql://quizgame:w8DPovt9I8XR9Bk8aphrR2Z6xYWUzEp2@dpg-d3frdu6mcj7s73er4om0-a.oregon-postgres.render.com/quizgame_tkox",
   ssl: {
      rejectUnauthorized: false
   }
});

module.exports = {
   query: (text, params) => pool.query(text, params),
};


