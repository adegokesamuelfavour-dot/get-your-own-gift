import express from 'express';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const db=new Database(process.env.DB_PATH||'locations.db');
db.pragma('journal_mode=WAL');
db.exec(`CREATE TABLE IF NOT EXISTS shares (token TEXT PRIMARY KEY, created_at TEXT NOT NULL, expires_at TEXT, label TEXT, lat REAL, lng REAL, accuracy REAL, updated_at TEXT)`);
app.use(express.json({limit:'20kb'}));
app.use(express.static(path.join(__dirname,'public')));

function auth(req,res,next){
 const key=process.env.ADMIN_KEY;
 if(!key) return res.status(500).json({error:'ADMIN_KEY is not configured'});
 const supplied=req.get('x-admin-key');
 if(!supplied || supplied!==key) return res.status(401).json({error:'Unauthorized'});
 next();
}
app.post('/api/share',auth,(req,res)=>{
 const token=crypto.randomBytes(18).toString('base64url');
 const label=String(req.body.label||'Meeting location').slice(0,100);
 const hours=Math.min(Math.max(Number(req.body.hours)||24,1),168);
 const now=new Date(), exp=new Date(now.getTime()+hours*3600000);
 db.prepare('INSERT INTO shares(token,created_at,expires_at,label) VALUES(?,?,?,?)').run(token,now.toISOString(),exp.toISOString(),label);
 res.json({token,url:`/share/${token}`,expiresAt:exp.toISOString()});
});
app.get('/api/share/:token',(req,res)=>{
 const row=db.prepare('SELECT token,created_at,expires_at,label,lat,lng,accuracy,updated_at FROM shares WHERE token=?').get(req.params.token);
 if(!row) return res.status(404).json({error:'Link not found'});
 if(row.expires_at && Date.now()>Date.parse(row.expires_at)) return res.status(410).json({error:'This location link has expired'});
 res.json(row);
});
app.post('/api/share/:token/location',(req,res)=>{
 const row=db.prepare('SELECT token,expires_at FROM shares WHERE token=?').get(req.params.token);
 if(!row) return res.status(404).json({error:'Link not found'});
 if(row.expires_at && Date.now()>Date.parse(row.expires_at)) return res.status(410).json({error:'This location link has expired'});
 const lat=Number(req.body.lat),lng=Number(req.body.lng),accuracy=Number(req.body.accuracy);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180) return res.status(400).json({error:'Invalid coordinates'});
 db.prepare('UPDATE shares SET lat=?,lng=?,accuracy=?,updated_at=? WHERE token=?').run(lat,lng,Number.isFinite(accuracy)?accuracy:null,new Date().toISOString(),req.params.token);
 res.json({ok:true});
});
app.get('/api/admin/shares',auth,(req,res)=>res.json(db.prepare('SELECT * FROM shares ORDER BY created_at DESC LIMIT 100').all()));
app.delete('/api/admin/shares/:token',auth,(req,res)=>{db.prepare('DELETE FROM shares WHERE token=?').run(req.params.token);res.json({ok:true});});
app.get('/share/:token',(req,res)=>res.sendFile(path.join(__dirname,'public','share.html')));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Location sharing server running on port ${port}`));
