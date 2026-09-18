export function paperTilt(velocityX,weight="paper"){const limit=weight==="paper"?6.5:3.5;return Math.max(-limit,Math.min(limit,-velocityX*(weight==="paper"?5.8:3.2)))||0;}
export function paperPose(dx,dy,baseAngle,tilt,lift,anchor,weight="paper"){
  const scale=1+(weight==="paper"?.055:.035)*lift,angle=baseAngle*(1-.3*lift)+tilt;
  const radians=(angle-baseAngle)*Math.PI/180;
  const x=scale*(anchor.x*Math.cos(radians)-anchor.y*Math.sin(radians));
  const y=scale*(anchor.x*Math.sin(radians)+anchor.y*Math.cos(radians));
  // Compensate the decorative rotation/scale around the exact grip point.
  return {x:dx+anchor.x-x,y:dy+anchor.y-y-(weight==="paper"?3:2)*lift,angle,scale};
}
export function paperVariant(id){
  let n=0;for(const char of id)n=(Math.imul(n,31)+char.charCodeAt(0))>>>0;
  return n%9;
}
