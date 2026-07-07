import {
  isParentGateAnswerCorrect,
  PARENT_GATE_CHALLENGE,
} from '../../core/parent-gate';

let _container: HTMLElement | null = null;

export interface ParentGateOptions {
  errorMessage?: string;
  onUnlock: () => void;
  onCancel: () => void;
}

export function renderParentGate(
  parent: HTMLElement,
  options: ParentGateOptions
): void {
  _container = document.createElement('div');
  _container.className = 'parent-gate-overlay';
  _container.id = 'parent-gate';

  const dialog = document.createElement('form');
  dialog.className = 'parent-gate-dialog';

  const title = document.createElement('h1');
  title.className = 'parent-gate-dialog__title';
  title.textContent = 'Parent Check';
  dialog.appendChild(title);

  const hint = document.createElement('p');
  hint.className = 'parent-gate-dialog__hint';
  hint.textContent = `Type ${PARENT_GATE_CHALLENGE} to open parent tools. This is local-only and not an account login.`;
  dialog.appendChild(hint);

  const input = document.createElement('input');
  input.className = 'parent-gate-dialog__input';
  input.id = 'parent-gate-answer';
  input.type = 'text';
  input.autocomplete = 'off';
  input.inputMode = 'text';
  input.setAttribute('aria-label', 'Parent check answer');
  dialog.appendChild(input);

  if (options.errorMessage) {
    const error = document.createElement('p');
    error.className = 'parent-gate-dialog__error';
    error.textContent = options.errorMessage;
    dialog.appendChild(error);
  }

  const actions = document.createElement('div');
  actions.className = 'parent-gate-dialog__actions';

  const submit = document.createElement('button');
  submit.className = 'parent-gate-dialog__submit';
  submit.type = 'submit';
  submit.textContent = 'Open Parent Panel';
  actions.appendChild(submit);

  const cancel = document.createElement('button');
  cancel.className = 'parent-gate-dialog__cancel';
  cancel.type = 'button';
  cancel.textContent = 'Back';
  cancel.addEventListener('click', options.onCancel);
  actions.appendChild(cancel);

  dialog.appendChild(actions);
  dialog.addEventListener('submit', (event) => {
    event.preventDefault();
    if (isParentGateAnswerCorrect(input.value)) {
      options.onUnlock();
      return;
    }

    input.value = '';
    input.focus();
    destroyParentGate();
    renderParentGate(parent, {
      ...options,
      errorMessage: 'Try again.',
    });
  });

  _container.appendChild(dialog);
  parent.appendChild(_container);
  input.focus();
}

export function destroyParentGate(): void {
  if (_container) {
    _container.remove();
    _container = null;
  }
}
