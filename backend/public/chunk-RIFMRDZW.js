function l(u,e){return r=>{let n=r.get(u),t=r.get(e);return!n||!t||t.errors&&!t.errors.mustMatch||t.setErrors(n.value!==t.value?{mustMatch:!0}:null),null}}export{l as a};
