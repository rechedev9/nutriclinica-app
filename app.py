from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
import sqlite3, os, uuid, io, unicodedata, shutil
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment

def nombre_a_prefijo(nombre):
    n = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode('ascii')
    return '_'.join(n.lower().split())

def nombre_a_carpeta(nombre):
    n = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode('ascii')
    return ''.join(w.capitalize() for w in n.split())

app      = Flask(__name__)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH  = os.path.join(BASE_DIR, 'bbdd', 'pacientes.db')
FOTOS_DIR = os.path.join(BASE_DIR, 'fotos')
os.makedirs(FOTOS_DIR, exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'bbdd'), exist_ok=True)


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS pacientes (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre           TEXT NOT NULL,
        fecha_nac        TEXT,
        sexo             TEXT,
        dni              TEXT,
        telefono         TEXT,
        email            TEXT,
        peso             REAL,
        altura           REAL,
        p_cintura        REAL,
        p_cadera         REAL,
        p_brazo          REAL,
        pct_grasa        REAL,
        pct_musculo      REAL,
        objetivo         TEXT,
        actividad_fisica TEXT,
        intolerancias    TEXT,
        patologias       TEXT,
        notas            TEXT,
        creado           TEXT DEFAULT (datetime('now','localtime'))
    )''')
    conn.execute('''CREATE TABLE IF NOT EXISTS fotos (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        paciente_id INTEGER NOT NULL,
        filename    TEXT NOT NULL,
        nota        TEXT,
        fecha       TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
    )''')
    conn.commit()
    conn.close()


# ─── RUTAS PRINCIPALES ────────────────────────────────────────────────────────

@app.route('/')
def index():
    return render_template('index.html')


# ─── PACIENTES ────────────────────────────────────────────────────────────────

@app.route('/api/pacientes', methods=['GET'])
def get_pacientes():
    conn = get_db()
    rows = conn.execute('SELECT * FROM pacientes ORDER BY nombre COLLATE NOCASE').fetchall()
    result = []
    for p in rows:
        cnt = conn.execute('SELECT COUNT(*) FROM fotos WHERE paciente_id=?', (p['id'],)).fetchone()[0]
        result.append({**dict(p), 'num_fotos': cnt})
    conn.close()
    return jsonify(result)


@app.route('/api/pacientes', methods=['POST'])
def create_paciente():
    d = request.json
    conn = get_db()
    cur = conn.execute(
        '''INSERT INTO pacientes
           (nombre, fecha_nac, sexo, dni, telefono, email,
            peso, altura, p_cintura, p_cadera, p_brazo,
            pct_grasa, pct_musculo, objetivo, actividad_fisica,
            intolerancias, patologias, notas)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
        (d['nombre'].strip(), d.get('fecha_nac') or None, d.get('sexo') or None,
         d.get('dni') or None, d.get('telefono') or None, d.get('email') or None,
         d.get('peso') or None, d.get('altura') or None,
         d.get('p_cintura') or None, d.get('p_cadera') or None, d.get('p_brazo') or None,
         d.get('pct_grasa') or None, d.get('pct_musculo') or None,
         d.get('objetivo') or None, d.get('actividad_fisica') or None,
         d.get('intolerancias') or None, d.get('patologias') or None,
         d.get('notas') or None)
    )
    conn.commit()
    p = conn.execute('SELECT * FROM pacientes WHERE id=?', (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify({**dict(p), 'num_fotos': 0}), 201


@app.route('/api/pacientes/<int:pid>', methods=['PUT'])
def update_paciente(pid):
    d = request.json
    conn = get_db()
    conn.execute(
        '''UPDATE pacientes SET nombre=?, fecha_nac=?, sexo=?, dni=?, telefono=?, email=?,
           peso=?, altura=?, p_cintura=?, p_cadera=?, p_brazo=?,
           pct_grasa=?, pct_musculo=?, objetivo=?, actividad_fisica=?,
           intolerancias=?, patologias=?, notas=?
           WHERE id=?''',
        (d['nombre'].strip(), d.get('fecha_nac') or None, d.get('sexo') or None,
         d.get('dni') or None, d.get('telefono') or None, d.get('email') or None,
         d.get('peso') or None, d.get('altura') or None,
         d.get('p_cintura') or None, d.get('p_cadera') or None, d.get('p_brazo') or None,
         d.get('pct_grasa') or None, d.get('pct_musculo') or None,
         d.get('objetivo') or None, d.get('actividad_fisica') or None,
         d.get('intolerancias') or None, d.get('patologias') or None,
         d.get('notas') or None, pid)
    )
    conn.commit()
    p = conn.execute('SELECT * FROM pacientes WHERE id=?', (pid,)).fetchone()
    cnt = conn.execute('SELECT COUNT(*) FROM fotos WHERE paciente_id=?', (pid,)).fetchone()[0]
    conn.close()
    return jsonify({**dict(p), 'num_fotos': cnt})


@app.route('/api/pacientes/<int:pid>', methods=['DELETE'])
def delete_paciente(pid):
    conn = get_db()
    p = conn.execute('SELECT nombre FROM pacientes WHERE id=?', (pid,)).fetchone()
    if p:
        carpeta = os.path.join(FOTOS_DIR, nombre_a_carpeta(p['nombre']))
        if os.path.exists(carpeta):
            shutil.rmtree(carpeta)
    conn.execute('DELETE FROM fotos WHERE paciente_id=?', (pid,))
    conn.execute('DELETE FROM pacientes WHERE id=?', (pid,))
    conn.commit()
    conn.close()
    return jsonify({'ok': True})


# ─── FOTOS ────────────────────────────────────────────────────────────────────

@app.route('/api/pacientes/<int:pid>/fotos', methods=['GET'])
def get_fotos(pid):
    conn = get_db()
    fotos = conn.execute('SELECT * FROM fotos WHERE paciente_id=? ORDER BY fecha DESC', (pid,)).fetchall()
    conn.close()
    return jsonify([dict(f) for f in fotos])


@app.route('/api/pacientes/<int:pid>/fotos', methods=['POST'])
def upload_foto(pid):
    file = request.files.get('foto')
    nota = request.form.get('nota', '').strip()
    if not file:
        return jsonify({'error': 'Sin archivo'}), 400
    conn = get_db()
    p         = conn.execute('SELECT nombre FROM pacientes WHERE id=?', (pid,)).fetchone()
    carpeta   = nombre_a_carpeta(p['nombre'])
    prefijo   = nombre_a_prefijo(p['nombre'])
    ext       = os.path.splitext(file.filename)[1].lower() or '.jpg'
    fecha_str = datetime.now().strftime('%Y%m%d_%H%M%S')
    fname     = f"{prefijo}_{fecha_str}_{uuid.uuid4().hex[:6]}{ext}"
    filename  = f"{carpeta}/{fname}"
    os.makedirs(os.path.join(FOTOS_DIR, carpeta), exist_ok=True)
    file.save(os.path.join(FOTOS_DIR, carpeta, fname))
    cur = conn.execute(
        'INSERT INTO fotos (paciente_id, filename, nota) VALUES (?,?,?)',
        (pid, filename, nota or None)
    )
    conn.commit()
    foto = conn.execute('SELECT * FROM fotos WHERE id=?', (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(dict(foto)), 201


@app.route('/api/fotos/<int:fid>', methods=['DELETE'])
def delete_foto(fid):
    conn = get_db()
    f = conn.execute('SELECT * FROM fotos WHERE id=?', (fid,)).fetchone()
    if f:
        path = os.path.join(FOTOS_DIR, f['filename'].replace('/', os.sep))
        if os.path.exists(path):
            os.remove(path)
        conn.execute('DELETE FROM fotos WHERE id=?', (fid,))
        conn.commit()
    conn.close()
    return jsonify({'ok': True})


@app.route('/fotos/<path:filename>')
def serve_foto(filename):
    return send_from_directory(FOTOS_DIR, filename)


# ─── EXPORTAR EXCEL ───────────────────────────────────────────────────────────

@app.route('/api/exportar-excel')
def exportar_excel():
    conn = get_db()
    pacientes = conn.execute('SELECT * FROM pacientes ORDER BY nombre COLLATE NOCASE').fetchall()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = 'Pacientes'

    verde  = PatternFill(start_color='16A34A', end_color='16A34A', fill_type='solid')
    blanco = Font(bold=True, color='FFFFFF', size=11)
    centro = Alignment(horizontal='center', vertical='center')

    cabeceras = [
        'ID', 'Nombre', 'Fecha nac.', 'Sexo', 'DNI', 'Teléfono', 'Email',
        'Peso (kg)', 'Altura (cm)', 'IMC', 'P. Cintura', 'P. Cadera', 'P. Brazo',
        '% Grasa', '% Músculo', 'Objetivo', 'Actividad física',
        'Intolerancias', 'Patologías', 'Notas', 'Nº fotos', 'Fecha alta'
    ]
    anchos = [6, 28, 14, 10, 14, 14, 28, 10, 10, 8, 10, 10, 10, 10, 10, 22, 18, 28, 28, 35, 8, 18]

    for i, (cab, ancho) in enumerate(zip(cabeceras, anchos), 1):
        cell = ws.cell(row=1, column=i, value=cab)
        cell.fill      = verde
        cell.font      = blanco
        cell.alignment = centro
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = ancho
    ws.row_dimensions[1].height = 22

    for r, p in enumerate(pacientes, 2):
        cnt    = conn.execute('SELECT COUNT(*) FROM fotos WHERE paciente_id=?', (p['id'],)).fetchone()[0]
        peso   = p['peso']
        altura = p['altura']
        imc    = round(peso / ((altura / 100) ** 2), 1) if peso and altura else ''
        valores = [
            p['id'], p['nombre'], p['fecha_nac'] or '', p['sexo'] or '',
            p['dni'] or '', p['telefono'] or '', p['email'] or '',
            peso or '', altura or '', imc,
            p['p_cintura'] or '', p['p_cadera'] or '', p['p_brazo'] or '',
            p['pct_grasa'] or '', p['pct_musculo'] or '',
            p['objetivo'] or '', p['actividad_fisica'] or '',
            p['intolerancias'] or '', p['patologias'] or '',
            p['notas'] or '', cnt, p['creado'] or ''
        ]
        for c, val in enumerate(valores, 1):
            ws.cell(row=r, column=c, value=val)

    conn.close()
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    nombre = f"pacientes_nutricion_{datetime.now().strftime('%Y%m%d_%H%M')}.xlsx"
    return send_file(buf,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True, download_name=nombre)


# ─── ARRANQUE ─────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    init_db()
    print('\n  NutriClínica corriendo en http://localhost:5001\n')
    app.run(debug=False, port=5001)
