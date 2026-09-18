export function paperTilt(velocityX){return Math.max(-2.2,Math.min(2.2,-velocityX*1.8))||0;}
export function paperPose(dx,dy,baseAngle,tilt,lift,anchor){
  const scale=1+.015*lift,angle=baseAngle*(1-.3*lift)+tilt;
  const radians=(angle-baseAngle)*Math.PI/180;
  const x=scale*(anchor.x*Math.cos(radians)-anchor.y*Math.sin(radians));
  const y=scale*(anchor.x*Math.sin(radians)+anchor.y*Math.cos(radians));
  // Compensate the decorative rotation/scale around the exact grip point.
  return {x:dx+anchor.x-x,y:dy+anchor.y-y,angle,scale};
}
export function paperVariant(id){
  let n=0;for(const char of id)n=(Math.imul(n,31)+char.charCodeAt(0))>>>0;
  return n%9;
}
