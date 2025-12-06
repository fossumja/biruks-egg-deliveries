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
    animate('200ms cubic-bezier(0, 0, 0.2, 1)')
  ]),
  transition('in => void', [
    animate(
      '180ms cubic-bezier(0, 0, 0.2, 1)',
      style({ opacity: 0, transform: 'translateY(-8px)' })
    )
  ])
]);
