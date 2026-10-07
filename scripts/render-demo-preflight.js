// Read-only operator check. Never creates a marker, fixture, relationship or account.
const {loadConfig}=require('../config');
const {createPool}=require('../db');
const {verifyDemo}=require('../family-demo-schema');
async function check() {
  const config=loadConfig();
  if (!config.familyDemo.publicDemo || !config.database.connectionString) throw new Error('PUBLIC_DEMO_NOT_CONFIGURED');
  const db=createPool(config.database);
  try {
    await verifyDemo(db,config.familyDemo.marker);
    const {rows}=await db.query(`SELECT u.id,u.email,u.rol,m.expected_email,m.expected_role
      FROM family_demo_members m JOIN users u ON u.id=m.user_id`);
    if (!rows.length || rows.some(u=>u.email!==u.expected_email || u.rol!==u.expected_role || !/^[^@\s]+@[^@\s]+\.(test|invalid)$/i.test(u.email))) throw new Error('FICTIONAL_MEMBERS_REQUIRED');
    if (!['profesional','paciente','familiar'].every(role=>rows.some(u=>u.rol===role))) throw new Error('DEMO_ROLES_REQUIRED');
    const links=await db.query(`SELECT count(*)::int AS count FROM professional_patient_links p
      JOIN family_demo_members pm ON pm.user_id=p.professional_id
      JOIN family_demo_members cm ON cm.user_id=p.patient_id WHERE p.active`);
    if (!links.rows[0].count) throw new Error('AUTHORIZED_DEMO_LINKS_REQUIRED');
    const ids=config.assistant.allowedUserIds;
    if (!ids.length || ids.some(id=>!rows.some(u=>String(u.id)===id && ['paciente','familiar'].includes(u.rol)))) throw new Error('GEMINI_DEMO_ALLOWLIST_REQUIRED');
    if (!config.assistant.enabled || !config.assistant.apiKey) throw new Error('GEMINI_PRIVATE_CONFIGURATION_REQUIRED');
    console.log(JSON.stringify({readOnly:true,markerMatches:true,fictionalMembers:rows.length,authorizedLinks:links.rows[0].count,geminiKeyPresent:true,model:config.assistant.model,liveProviderTested:false}));
  } finally { await db.end(); }
}
if(require.main===module) check().catch(()=>{console.error('PUBLIC_DEMO_PREFLIGHT_FAILED: revisar marcador, miembros ficticios, vínculos y configuración privada; no se modificaron datos');process.exitCode=1;});
module.exports={check};
