import { animate, state, style, transition, trigger } from '@angular/animations';

export const cardChangeTrigger = trigger('cardChange', [
  state(
    'in',
    style({
      opacity: 1,
      transform: 'translateY(0)'
    })
  ),
  transition('void => in', [
    style({ opacity: 0, transform: 'translateY(12px)' }),
    animate('200ms var(--easing-ease-out)')
  ]),
  transition('in => void', [
    animate('180ms var(--easing-ease-out)', style({ opacity: 0, transform: 'translateY(-8px)' }))
  ])
]);
