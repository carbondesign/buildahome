import alt from '../alt';

class StoriesServerActions {
  constructor () {
    this.generateActions(
      'storiesLoading',
      'resultsUpdated',
      'recommendedUpdated',
      'storiesUpdated',
      'error'
    );
  }
}

export default alt.createActions(StoriesServerActions);
