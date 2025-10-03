const express = require("express")
const cors = require("cors")
const db = require("./db")

const app = express();

app.use(cors())
app.use(express.json());

function generateUniqueId() {
   const now = new Date();

   const year = now.getFullYear();
   const month = String(now.getMonth() + 1).padStart(2, '0');
   const day = String(now.getDate()).padStart(2, '0');
   const hour = String(now.getHours()).padStart(2, '0');
   const minute = String(now.getMinutes()).padStart(2, '0');
   const second = String(now.getSeconds()).padStart(2, '0');
   const millisecond = String(now.getMilliseconds()).padStart(3, '0');

   const rl = () => Math.random().toString(36).substring(2, 6);

   const uniqueId = `${rl()}${year}${month}${day}${hour}${rl()}${minute}${second}${rl()}${millisecond}${rl()}`;

   return uniqueId;
}

async function init() {
   await db.query(`
      CREATE TABLE IF NOT EXISTS perguntas (
         id TEXT PRIMARY KEY,
         text TEXT NOT NULL,
         alternatives TEXT[] NOT NULL,
         correct_index INTEGER NOT NULL,
         category TEXT,
         level TEXT,
         tags TEXT[],
         points INTEGER DEFAULT 10
      );
      

      CREATE TABLE IF NOT EXISTS usuarios (
         id TEXT PRIMARY KEY,
         nome TEXT NOT NULL,
         total_pontos INTEGER DEFAULT 0,
         nomeunico TEXT NOT NULL UNIQUE,
         senha TEXT NOT NULL,
         is_admin BOOLEAN DEFAULT FALSE
      );
   `);
}

init().catch((err) => {
   console.error('Failed to initialize database schema:', err);
   process.exit(1);
});

app.get('/perguntas', async (req, res) => {
   const { rows: perguntas } = await db.query('SELECT * FROM perguntas')

   res.json(perguntas)
})

app.post("/perguntas", async (req, res) => {
   const { text, alternatives, correct_index, category, level, tags, points } = req.body
   const id = generateUniqueId()

   await db.query(
      'INSERT INTO perguntas (id, text, alternatives, correct_index, category, level, tags, points) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, text, alternatives, correct_index, category, level, tags, points || 10]
   );

   res.status(200).json({ id })
})

app.put("/perguntas/:id", async (req, res) => {
   const { id } = req.params
   const { text, alternatives, correct_index, category, level, tags, points } = req.body

   await db.query(
      'UPDATE perguntas SET text = $1, alternatives = $2, correct_index = $3, category = $4, level = $5, tags = $6, points = $7 WHERE id = $8',
      [text, alternatives, correct_index, category, level, tags, points || 10, id]
   );

   res.status(200).json({ id })
})

app.delete("/perguntas/:id", async (req, res) => {
   const { id } = req.params

   await db.query('DELETE FROM perguntas WHERE id = $1', [id]);
   res.status(200).json({ id })
})

app.get('/usuarios', async (req, res) => {
   const { rows: usuarios } = await db.query('SELECT * FROM usuarios')

   res.json(usuarios)
})

app.get('/usuarios/ranking', async (req, res) => {
   const { rows: usuarios } = await db.query('SELECT * FROM usuarios')
   const usersranked = usuarios.sort((a, b) => b.total_pontos - a.total_pontos)
   res.json(usersranked)
})

app.post("/usuarios", async (req, res) => {
   const { nome, senha } = req.body
   const id = generateUniqueId()
   const nomeunico = Date.now().toString(36)

   await db.query(
      'INSERT INTO usuarios (id, nome, senha, total_pontos, nomeunico, is_admin) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, nome, senha, 0, nomeunico, false]
   );

   res.status(200).json({ id: nomeunico })
})

app.post("/login", async (req, res) => {
   const { nomeunico, senha } = req.body

   if (!nomeunico || !senha) {
      return res.status(400).json({ error: "nomeunico e senha são obrigatórios" })
   }

   try {
      const { rows } = await db.query(
         'SELECT id, nome, nomeunico FROM usuarios WHERE nomeunico = $1 AND senha = $2 LIMIT 1',
         [nomeunico, senha]
      )

      if (!rows || rows.length === 0) {
         return res.status(404).json({ error: "Usuário não encontrado ou senha incorreta" })
      }

      const usuario = rows[0]
      return res.status(200).json({ id: usuario.nomeunico, nome: usuario.nome })
   } catch (err) {
      console.error('Erro no login:', err)
      return res.status(500).json({ error: "Erro interno no servidor" })
   }
})

app.get("/usuarios/:id", async (req, res) => {
   const { id } = req.params

   const { rows: usu } = await db.query('SELECT * FROM usuarios  WHERE nomeunico = $1', [id])
   const user = usu[0]

   if (!user) {
      res.status(400).json({ "erro": "erro" })
   }

   res.status(200).json(user)
})

app.put("/usuarios/:id/point", async (req, res) => {
   const { id } = req.params
   const { point } = req.body

   const { rows: usu } = await db.query('SELECT * FROM usuarios  WHERE nomeunico = $1', [id])
   const user = usu[0]

   if (!user) {
      res.status(400).json({ "erro": "erro" })
   }

   await db.query(
      'UPDATE usuarios SET total_pontos = $1 WHERE id = $2',
      [user.total_pontos + point, user.id]
   );

   res.status(200).json({ user })
})

app.put("/usuarios/:id/admin", async (req, res) => {
   const { id } = req.params
   const { is_admin } = req.body

   await db.query(
      'UPDATE usuarios SET is_admin = $1 WHERE id = $2',
      [is_admin, id]
   );

   res.status(200).json({ id })
})

app.delete("/usuarios/:id", async (req, res) => {
   const { id } = req.params

   await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
   res.status(200).json({ id })
})

app.listen(5000, () => {
   console.log(`Server is running on port http://localhost:5000`);
});