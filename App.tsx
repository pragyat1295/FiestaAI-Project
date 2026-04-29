import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import ChatScreen from './src/screens/ChatScreen';

function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <ChatScreen />
    </Provider>
  );
}

export default App;
