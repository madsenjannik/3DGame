// @ts-nocheck
export class ChoicePanel {
  constructor(state) {
    this.state = state;
    this.root = document.getElementById('choice-panel');
    this.plant = document.getElementById('choice-plant');
    this.donate = document.getElementById('choice-donate');

    this.plant.addEventListener('click', () => this.choose('plant'));
    this.donate.addEventListener('click', () => this.choose('donate'));
    addEventListener('keydown', e => {
      if (!this.state.choice.open) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') { e.preventDefault(); this.choose('plant'); }
      if (e.code === 'Digit2' || e.code === 'Numpad2') { e.preventDefault(); this.choose('donate'); }
    });

    state.events.on('choice:opened', () => this.open());
    state.events.on('choice:resolved', () => this.close());
  }

  choose(result) {
    if (!this.state.choice.open) return;
    this.state.resolveSeedChoice(result);
  }

  open() {
    this.root.classList.add('show');
    document.body.classList.add('choice-open');
  }

  close() {
    this.root.classList.remove('show');
    document.body.classList.remove('choice-open');
  }
}
