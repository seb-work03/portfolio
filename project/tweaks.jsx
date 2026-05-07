/* global React, ReactDOM, TweaksPanel, useTweaks, TweakSection, TweakRadio */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mood": "aurora",
  "vibe": "balanced",
  "density": "comfortable"
}/*EDITMODE-END*/;

function applyTweaks(t){
  const root = document.documentElement;
  root.setAttribute('data-mood', t.mood);
  root.setAttribute('data-vibe', t.vibe);
  root.setAttribute('data-density', t.density);

  // Re-stagger reveal-words inline delays based on vibe
  const stagger = t.vibe === 'calm' ? 80 : t.vibe === 'lively' ? 60 : 110;
  document.querySelectorAll('.reveal-words').forEach(el=>{
    const spans = [...el.querySelectorAll(':scope > span')];
    spans.forEach((s,i)=>{
      const isEm = !!(s.firstElementChild && s.firstElementChild.classList && s.firstElementChild.classList.contains('em'))
                || (s.classList && s.classList.contains('em'));
      const extra = isEm ? 220 : 0;
      s.style.transitionDelay = (i*stagger + extra) + 'ms';
    });
  });

  // Cycle interval — speed up cycle on lively, slow down on calm
  if(window.__cycleInterval){
    clearInterval(window.__cycleInterval);
  }
  const cycleMs = t.vibe === 'calm' ? 4800 : t.vibe === 'lively' ? 2200 : 3200;
  if(typeof window.exitCycleWord === 'function' && typeof window.renderCycleWord === 'function' && Array.isArray(window.cycleWords)){
    window.__cycleInterval = setInterval(()=>{
      window.exitCycleWord(()=>{
        window.cycleIdx = ((window.cycleIdx ?? 0) + 1) % window.cycleWords.length;
        window.renderCycleWord(window.cycleWords[window.cycleIdx]);
      });
    }, cycleMs);
  }
}

function App(){
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(()=>{ applyTweaks(tweaks); }, [tweaks.mood, tweaks.vibe, tweaks.density]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Mood">
        <TweakRadio
          value={tweaks.mood}
          onChange={v=>setTweak('mood', v)}
          options={[
            {value:'aurora', label:'Aurora'},
            {value:'violet', label:'Violet'},
            {value:'sunset', label:'Sunset'},
            {value:'mono', label:'Mono'},
          ]}
        />
        <div style={{fontSize:11, color:'rgba(255,255,255,.5)', marginTop:8, lineHeight:1.4}}>
          Re-tints the entire palette: shader, accents, gradient text.
        </div>
      </TweakSection>

      <TweakSection label="Vibe">
        <TweakRadio
          value={tweaks.vibe}
          onChange={v=>setTweak('vibe', v)}
          options={[
            {value:'calm', label:'Calm'},
            {value:'balanced', label:'Balanced'},
            {value:'lively', label:'Lively'},
          ]}
        />
        <div style={{fontSize:11, color:'rgba(255,255,255,.5)', marginTop:8, lineHeight:1.4}}>
          Drives motion intensity, glow, blur, marquee speed, word stagger.
        </div>
      </TweakSection>

      <TweakSection label="Density">
        <TweakRadio
          value={tweaks.density}
          onChange={v=>setTweak('density', v)}
          options={[
            {value:'compact', label:'Compact'},
            {value:'comfortable', label:'Comfy'},
            {value:'spacious', label:'Spacious'},
          ]}
        />
        <div style={{fontSize:11, color:'rgba(255,255,255,.5)', marginTop:8, lineHeight:1.4}}>
          Section padding, card padding, type scale.
        </div>
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<App />);
