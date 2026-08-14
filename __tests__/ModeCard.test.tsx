import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {ModeCard} from '../src/components/ModeCard';

describe('ModeCard accessibility', () => {
  it('exposes a labeled button and activates with a press', () => {
    const onPress = jest.fn();
    const screen = render(<ModeCard mode="gym" onPress={onPress} />);
    const button = screen.getByRole('button', {name: 'Gym Mode'});
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
