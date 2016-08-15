'use babel';

import BlueWireView from './blue-wire-view';
import { CompositeDisposable } from 'atom';

export default {

  blueWireView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.blueWireView = new BlueWireView(state.blueWireViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.blueWireView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'blue-wire:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.blueWireView.destroy();
  },

  serialize() {
    return {
      blueWireViewState: this.blueWireView.serialize()
    };
  },

  toggle() {
    console.log('BlueWire was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
