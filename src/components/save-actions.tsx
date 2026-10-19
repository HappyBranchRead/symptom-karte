'use client';
import {useEffect, useRef, type ReactNode} from 'react';

export function SaveActions({children}: {children: ReactNode}) {
 const bar = useRef<HTMLDivElement>(null);
 useEffect(() => {
  const element = bar.current;
  if (!element) return;
  const form = element.closest('form');
  const viewport = window.visualViewport;
  function updateInset() {
   if (!element) return;
   // A virtual keyboard can shrink the visual viewport without resizing the layout.
   const inset = viewport && viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
   element.style.setProperty('--keyboard-inset', `${inset > 120 ? inset : 0}px`);
  }
  const observer = new ResizeObserver(() => {
   form?.style.setProperty('--save-bar-height', `${element.getBoundingClientRect().height}px`);
  });
  observer.observe(element);
  updateInset();
  viewport?.addEventListener('resize', updateInset);
  viewport?.addEventListener('scroll', updateInset);
  window.addEventListener('resize', updateInset);
  return () => {
   observer.disconnect();
   viewport?.removeEventListener('resize', updateInset);
   viewport?.removeEventListener('scroll', updateInset);
   window.removeEventListener('resize', updateInset);
   form?.style.removeProperty('--save-bar-height');
  };
 }, []);
 return <div ref={bar} className="field-actions karte-actions">{children}</div>;
}
