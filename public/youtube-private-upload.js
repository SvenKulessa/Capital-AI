const output=document.getElementById('upload-result');
const upload=document.getElementById('upload-short');
const verify=document.getElementById('verify-short');
async function run(uploading) {
  upload.disabled=true;verify.disabled=true;output.textContent='Wird geprüft …';
  try {
    const file=document.getElementById('short-file').files[0];
    if(uploading&&!file)throw Error('Bitte den OHLC-Short auswählen.');
    const response=await fetch('/api/social-media/youtube/private-test/'+(uploading?'upload':'status'),
      uploading?{method:'POST',headers:{'Content-Type':'video/mp4'},body:file,credentials:'same-origin',redirect:'error'}
        :{credentials:'same-origin',redirect:'error'});
    const result=await response.json();output.textContent=JSON.stringify(result,null,2);
    upload.disabled=result.status==='VERIFIED_PRIVATE'||result.status==='UNKNOWN'||result.retryUpload===false;
  } catch {output.textContent='Kein bestätigtes Ergebnis. Bitte zuerst Upload-Status prüfen.';upload.disabled=true;}
  finally {verify.disabled=false;}
}
upload.addEventListener('click',()=>run(true));verify.addEventListener('click',()=>run(false));
