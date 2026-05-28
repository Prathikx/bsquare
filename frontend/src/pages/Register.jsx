import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import toast from "react-hot-toast";

const CITY_COORDS = {
  Hyderabad:[17.385,78.4867],Mumbai:[19.076,72.8777],Delhi:[28.6139,77.209],
  Bangalore:[12.9716,77.5946],Chennai:[13.0827,80.2707],Pune:[18.5204,73.8567],
  Ahmedabad:[23.0225,72.5714],Kolkata:[22.5726,88.3639],Jaipur:[26.9124,75.7873],Surat:[21.1702,72.8311],
};
const INDUSTRIES=["IT Services","Textiles & Garments","Food & Beverages","Pharmaceuticals","Logistics & Transport","Manufacturing","Real Estate","Finance & Banking","Healthcare","Education","Retail & Wholesale","Construction","Agriculture","Chemicals","Automotive","Other"];

export default function Register() {
  const { register } = useAuth();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [locStatus, setLocStatus] = useState("idle");
  const [coords, setCoords] = useState(null);
  const [verificationType, setVerificationType] = useState("din");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name:"",businessName:"",industry:"",city:"",bio:"",
    dinNumber:"",dinDirectorName:"",
    linkedinUrl:"",
    successionPrevDin:"",successionNewDin:"",successionDocNote:"",
    email:"",password:"",confirmPassword:"",phone:"",
  });
  const [errors, setErrors] = useState({});

  useEffect(()=>{ requestLocation(); },[]);

  const requestLocation=()=>{
    if(!navigator.geolocation){setLocStatus("denied");return;}
    setLocStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      pos=>{setCoords({lat:pos.coords.latitude,lng:pos.coords.longitude});setLocStatus("granted");},
      ()=>setLocStatus("denied"),
      {enableHighAccuracy:true,timeout:10000}
    );
  };

  const f=(k)=>(e)=>{setForm(p=>({...p,[k]:e.target.value}));if(errors[k])setErrors(p=>({...p,[k]:""}));};

  const inp=(label,key,type="text",placeholder="",required=false)=>(
    <div style={{marginBottom:14}}>
      <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>{label}{required&&" *"}</label>
      <input type={type} value={form[key]} onChange={f(key)} placeholder={placeholder}
        style={{width:"100%",padding:"10px 13px",borderRadius:10,border:`1.5px solid ${errors[key]?"#ef4444":"#e2e8f0"}`,fontSize:14,outline:"none",background:"#fff",color:"#1a202c",boxSizing:"border-box"}}/>
      {errors[key]&&<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors[key]}</p>}
    </div>
  );

  const validateStep1=()=>{
    const e={};
    if(!form.name.trim())e.name="Full name is required";
    if(!form.businessName.trim())e.businessName="Business name is required";
    if(!form.city)e.city="City is required";
    setErrors(e);return Object.keys(e).length===0;
  };

  const validateStep2=()=>{
    const e={};
    if(verificationType==="din"){
      if(!form.dinNumber.trim())e.dinNumber="DIN number is required";
      else if(!/^\d{8}$/.test(form.dinNumber.trim()))e.dinNumber="DIN must be exactly 8 digits";
      if(!form.dinDirectorName.trim())e.dinDirectorName="Director name as on MCA is required";
    } else if(verificationType==="linkedin"){
      if(!form.linkedinUrl.trim())e.linkedinUrl="LinkedIn URL is required";
      else if(!form.linkedinUrl.toLowerCase().includes("linkedin.com/in/"))e.linkedinUrl="Must be a valid LinkedIn profile URL";
    } else if(verificationType==="succession"){
      if(!form.successionDocNote.trim())e.successionDocNote="Please describe your succession document";
      if(form.successionNewDin.trim()&&!/^\d{8}$/.test(form.successionNewDin.trim()))e.successionNewDin="DIN must be 8 digits";
    }
    setErrors(e);return Object.keys(e).length===0;
  };

  const validateStep3=()=>{
    const e={};
    if(!form.email.trim())e.email="Email is required";
    else if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))e.email="Invalid email";
    if(!form.password)e.password="Password is required";
    else if(form.password.length<8)e.password="Minimum 8 characters";
    if(form.password!==form.confirmPassword)e.confirmPassword="Passwords do not match";
    if(!form.phone)e.phone="Phone number is required"; else if(!/^[6-9]\d{9}$/.test(form.phone))e.phone="Invalid Indian phone number (10 digits starting with 6-9)";
    setErrors(e);return Object.keys(e).length===0;
  };

  const submit=async()=>{
    if(!validateStep3())return;
    setLoading(true);
    let lat,lng;
    if(coords){lat=coords.lat;lng=coords.lng;}
    else{const[clat,clng]=CITY_COORDS[form.city]||[17.385,78.4867];lat=clat+(Math.random()-0.5)*0.02;lng=clng+(Math.random()-0.5)*0.02;}
    try{
      await register({
        name:form.name.trim(),businessName:form.businessName.trim(),
        industry:form.industry,city:form.city,bio:form.bio.trim(),
        email:form.email.trim().toLowerCase(),password:form.password,
        phone:form.phone,verificationType,
        dinNumber:verificationType==="din"?form.dinNumber.trim():undefined,
        dinDirectorName:verificationType==="din"?form.dinDirectorName.trim():undefined,
        linkedinUrl:verificationType==="linkedin"?form.linkedinUrl.trim():undefined,
        successionPrevDin:form.successionPrevDin.trim()||undefined,
        successionNewDin:form.successionNewDin.trim()||undefined,
        successionDocUrl:form.successionDocNote.trim()||undefined,
        lat,lng,
      });
      setSubmitted(true);
    }catch(err){
      const msg=err.response?.data?.error||"Registration failed";
      if(msg.toLowerCase().includes("din")){setStep(2);setErrors({dinNumber:msg});}
      else if(msg.toLowerCase().includes("linkedin")){setStep(2);setErrors({linkedinUrl:msg});}
      else if(msg.toLowerCase().includes("email")){setErrors({email:msg});}
      else toast.error(msg);
    }finally{setLoading(false);}
  };

  const badge=locStatus==="granted"?{bg:"#dcfce7",color:"#15803d",text:"📍 Live GPS location active"}
    :locStatus==="requesting"?{bg:"#dbeafe",color:"#1e40af",text:"⏳ Requesting location..."}
    :{bg:"#fef3c7",color:"#92400e",text:"⚠️ Location denied — city center will be used"};

  const s=(key)=>({width:"100%",padding:"10px 13px",borderRadius:10,border:`1.5px solid ${errors[key]?"#ef4444":"#e2e8f0"}`,fontSize:14,outline:"none",background:"#fff",color:"#1a202c",boxSizing:"border-box"});
  const stepLabels=["Business Info","Verification","Account"];

  if(submitted) return(
    <div style={{minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem"}}>
      <div style={{textAlign:"center",maxWidth:420}}>
        <div style={{width:64,height:64,background:"#dcfce7",borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:16}}>✓</div>
        <h1 style={{fontSize:22,fontWeight:700,color:"#1a202c",marginBottom:8}}>Application submitted!</h1>
        <p style={{color:"#718096",fontSize:14,lineHeight:1.7,marginBottom:20}}>
          Your account is under review. Our team will verify your details within <strong>24 hours</strong> and notify you by email once approved.
        </p>
        <div style={{background:"#fff",border:"0.5px solid #e2e8f0",borderRadius:14,padding:"1.25rem",marginBottom:20,textAlign:"left"}}>
          {[["Business",form.businessName],["Verification",verificationType==="din"?"DIN — Director ID":verificationType==="linkedin"?"LinkedIn Profile":"Business Succession"],["Status","Pending review"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"0.5px solid #f1f5f9",fontSize:13}}>
              <span style={{color:"#718096"}}>{k}</span><span style={{fontWeight:500,color:"#1a202c"}}>{v}</span>
            </div>
          ))}
        </div>
        <Link to="/login" style={{display:"inline-block",padding:"11px 28px",background:"#1a1a2e",color:"#fff",borderRadius:10,textDecoration:"none",fontSize:14,fontWeight:600}}>Back to Sign In</Link>
      </div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"#f8fafc",display:"flex",alignItems:"center",justifyContent:"center",padding:"2rem 1rem"}}>
      <div style={{width:"100%",maxWidth:500}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:50,height:50,background:"#1a1a2e",borderRadius:13,display:"inline-flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:21,fontWeight:800,marginBottom:10}}>B²</div>
          <h1 style={{fontSize:22,fontWeight:700,color:"#1a202c",margin:0}}>Create your B Square account</h1>
          <p style={{color:"#718096",fontSize:13,marginTop:5}}>Connect with verified business professionals near you</p>
        </div>

        <div style={{background:badge.bg,color:badge.color,borderRadius:10,padding:"9px 14px",marginBottom:14,fontSize:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>{badge.text}</span>
          {locStatus==="denied"&&<button onClick={requestLocation} style={{background:"transparent",border:`1px solid ${badge.color}`,borderRadius:6,padding:"2px 8px",fontSize:11,cursor:"pointer",color:badge.color}}>Retry</button>}
        </div>

        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:18,justifyContent:"center"}}>
          {stepLabels.map((label,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:step>i+1?"#16a34a":step===i+1?"#1a1a2e":"#e2e8f0",color:step>=i+1?"#fff":"#718096",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:600}}>{step>i+1?"✓":i+1}</div>
              <span style={{fontSize:12,color:step===i+1?"#1a202c":"#718096",fontWeight:step===i+1?500:400}}>{label}</span>
              {i<2&&<div style={{width:24,height:1.5,background:step>i+1?"#16a34a":"#e2e8f0"}}/>}
            </div>
          ))}
        </div>

        <div style={{background:"#fff",borderRadius:16,padding:"1.75rem",boxShadow:"0 1px 3px rgba(0,0,0,0.07)",border:"0.5px solid #e2e8f0"}}>

          {step===1&&<>
            <p style={{fontSize:15,fontWeight:600,color:"#1a202c",marginBottom:16}}>Business Information</p>
            {inp("Your Full Name","name","text","e.g. Prathik Sharma",true)}
            {inp("Business / Organisation Name","businessName","text","e.g. Prathik Ventures Pvt. Ltd.",true)}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Industry</label>
                <select value={form.industry} onChange={f("industry")} style={{width:"100%",padding:"10px 13px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,background:"#fff",color:"#1a202c",boxSizing:"border-box"}}>
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>City *</label>
                <select value={form.city} onChange={f("city")} style={{width:"100%",padding:"10px 13px",borderRadius:10,border:`1.5px solid ${errors.city?"#ef4444":"#e2e8f0"}`,fontSize:14,background:"#fff",color:"#1a202c",boxSizing:"border-box"}}>
                  <option value="">Select city</option>
                  {Object.keys(CITY_COORDS).map(c=><option key={c}>{c}</option>)}
                </select>
                {errors.city&&<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.city}</p>}
              </div>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Business Bio</label>
              <textarea value={form.bio} onChange={f("bio")} placeholder="What does your business do? (optional)" rows={2}
                style={{width:"100%",padding:"10px 13px",borderRadius:10,border:"1.5px solid #e2e8f0",fontSize:14,background:"#fff",color:"#1a202c",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit"}}/>
            </div>
            <button onClick={()=>validateStep1()&&setStep(2)} style={{width:"100%",padding:"11px",background:"#1a1a2e",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer"}}>Continue →</button>
          </>}

          {step===2&&<>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button onClick={()=>setStep(1)} style={{background:"transparent",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#4a5568"}}>← Back</button>
              <p style={{fontSize:15,fontWeight:600,color:"#1a202c",margin:0,alignSelf:"center"}}>Identity Verification</p>
            </div>
            <p style={{fontSize:13,color:"#718096",marginBottom:14}}>Choose how you'd like to verify your professional identity:</p>

            {[
              {type:"din",title:"DIN — Director Identification Number",badge:"Manual review",badgeBg:"#dcfce7",badgeColor:"#15803d",desc:"For company directors registered with MCA India. Submit your 8-digit DIN and your name exactly as it appears on the MCA portal. Admin verifies before approval."},
              {type:"succession",title:"Business Succession",badge:"Manual review",badgeBg:"#fef3c7",badgeColor:"#92400e",desc:"Inherited or took over a family business? Submit your predecessor's DIN, your own new DIN (if obtained), and a board resolution or succession document."},
              {type:"linkedin",title:"LinkedIn Profile",badge:"Manual review",badgeBg:"#dbeafe",badgeColor:"#1e40af",desc:"For freelancers, consultants & self-employed professionals without a DIN. We review your profile to confirm genuine business activity."},
            ].map(opt=>(
              <div key={opt.type} onClick={()=>setVerificationType(opt.type)}
                style={{padding:"13px",border:`1.5px solid ${verificationType===opt.type?"#1a1a2e":"#e2e8f0"}`,borderRadius:12,cursor:"pointer",background:verificationType===opt.type?"#f8fafc":"#fff",marginBottom:10,transition:"border-color 0.2s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{width:17,height:17,borderRadius:"50%",border:`2px solid ${verificationType===opt.type?"#1a1a2e":"#cbd5e1"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {verificationType===opt.type&&<div style={{width:7,height:7,borderRadius:"50%",background:"#1a1a2e"}}/>}
                    </div>
                    <span style={{fontSize:14,fontWeight:600,color:"#1a202c"}}>{opt.title}</span>
                  </div>
                  <span style={{background:opt.badgeBg,color:opt.badgeColor,fontSize:11,padding:"2px 8px",borderRadius:20,fontWeight:500,whiteSpace:"nowrap"}}>{opt.badge}</span>
                </div>
                <p style={{fontSize:12,color:"#718096",margin:"0 0 0 25px",lineHeight:1.5}}>{opt.desc}</p>
              </div>
            ))}

            {verificationType==="din"&&<div style={{marginTop:14}}>
              <div style={{marginBottom:12}}>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>DIN Number *</label>
                <input style={s("dinNumber")} value={form.dinNumber} onChange={f("dinNumber")} placeholder="e.g. 00123456 (8 digits)"/>
                {errors.dinNumber?<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.dinNumber}</p>
                  :<p style={{fontSize:12,color:"#718096",marginTop:4}}>Your 8-digit Director Identification Number from MCA India</p>}
              </div>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Director Name as registered with MCA *</label>
                <input style={s("dinDirectorName")} value={form.dinDirectorName} onChange={f("dinDirectorName")} placeholder="Full name exactly as on MCA portal (e.g. RAVI KUMAR SHARMA)"/>
                {errors.dinDirectorName&&<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.dinDirectorName}</p>}
                <p style={{fontSize:12,color:"#718096",marginTop:4}}>Admin will verify this against the MCA portal at mca.gov.in</p>
              </div>
            </div>}

            {verificationType==="succession"&&<div style={{marginTop:14,display:"flex",flexDirection:"column",gap:12}}>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Previous Owner's DIN (if known)</label>
                <input style={s("successionPrevDin")} value={form.successionPrevDin} onChange={f("successionPrevDin")} placeholder="Original director's 8-digit DIN"/>
              </div>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Your New DIN (if already obtained)</label>
                <input style={s("successionNewDin")} value={form.successionNewDin} onChange={f("successionNewDin")} placeholder="Leave blank if not yet applied"/>
                {errors.successionNewDin&&<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.successionNewDin}</p>}
              </div>
              <div>
                <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>Succession Document Description *</label>
                <textarea value={form.successionDocNote} onChange={f("successionDocNote")} placeholder="Describe your document: e.g. 'Board resolution dated 01/01/2024 transferring directorship from father Ramesh Kapoor to son Arjun Kapoor'" rows={3}
                  style={{...s("successionDocNote"),resize:"vertical",fontFamily:"inherit"}}/>
                {errors.successionDocNote&&<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.successionDocNote}</p>}
              </div>
              <div style={{background:"#dbeafe",borderRadius:8,padding:"10px 12px"}}>
                <p style={{fontSize:12,color:"#1e40af",margin:0}}>ℹ️ If you don't have a DIN yet, apply at <strong>mca.gov.in</strong> → MCA Services → DIN Services → Apply for DIN. Takes 1–3 business days. You can submit now and our admin will follow up.</p>
              </div>
            </div>}

            {verificationType==="linkedin"&&<div style={{marginTop:14}}>
              <label style={{fontSize:13,color:"#4a5568",display:"block",marginBottom:5,fontWeight:500}}>LinkedIn Profile URL *</label>
              <input type="url" style={s("linkedinUrl")} value={form.linkedinUrl} onChange={f("linkedinUrl")} placeholder="https://linkedin.com/in/yourprofile"/>
              {errors.linkedinUrl?<p style={{color:"#ef4444",fontSize:12,marginTop:4}}>{errors.linkedinUrl}</p>
                :<p style={{fontSize:12,color:"#718096",marginTop:4}}>Profiles with no work history or under 50 connections will not be approved.</p>}
            </div>}

            <button onClick={()=>validateStep2()&&setStep(3)} style={{width:"100%",padding:"11px",background:"#1a1a2e",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer",marginTop:16}}>Continue →</button>
          </>}

          {step===3&&<>
            <div style={{display:"flex",gap:10,marginBottom:16}}>
              <button onClick={()=>setStep(2)} style={{background:"transparent",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:12,color:"#4a5568"}}>← Back</button>
              <p style={{fontSize:15,fontWeight:600,color:"#1a202c",margin:0,alignSelf:"center"}}>Account Details</p>
            </div>
            {inp("Email Address","email","email","info@yourbusiness.in",true)}
            {inp("Phone Number","phone","tel","98xxxxxxxx",true)}
            {inp("Password","password","password","Minimum 8 characters",true)}
            {inp("Confirm Password","confirmPassword","password","Re-enter password",true)}
            <button onClick={submit} disabled={loading}
              style={{width:"100%",padding:"11px",background:loading?"#718096":"#1a1a2e",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:loading?"not-allowed":"pointer",marginTop:4}}>
              {loading?"Submitting...":"Submit for Review"}
            </button>
          </>}
        </div>

        <p style={{textAlign:"center",fontSize:13,color:"#718096",marginTop:14}}>
          Already have an account? <Link to="/login" style={{color:"#1a1a2e",fontWeight:600,textDecoration:"none"}}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
