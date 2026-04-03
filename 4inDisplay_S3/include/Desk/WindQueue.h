#ifndef WINDQUEUE_H
#define WINDQUEUE_H

#include <Arduino.h>

/**
 * @brief Fixed-size ring buffer for wind samples.
 */
class WindQueue
{
public:
    /** @brief Resets indices to empty state. */
    void reset()
    {
        _readIndex = 0;
        _writeIndex = 0;
    }

    /** @brief Pushes a sample into the buffer (overwrites oldest on wrap). */
    void push(int16_t speedHigh, int16_t directionLow, int16_t directionHigh)
    {
        _queue[_writeIndex][0] = speedHigh;
        _queue[_writeIndex][1] = directionLow;
        _queue[_writeIndex][2] = directionHigh;
        _writeIndex = (_writeIndex + 1) % kSize;
    }

    /**
     * @brief Reads the current entry and advances if data is available.
     *
     * Averages samples when the queue gets behind to smooth bursts.
     */
    bool pop(int16_t &speedHigh, int16_t &directionLow, int16_t &directionHigh)
    {
        if (_readIndex == _writeIndex)
            return false;

        speedHigh = _queue[_readIndex][0];
        directionLow = _queue[_readIndex][1];
        directionHigh = _queue[_readIndex][2];
        _readIndex = (_readIndex + 1) % kSize;

        // need to catch up
        if (length() > 5)
        {
            // add in 3 more
            for (int i = 0; i < 3; i++)
            {
                speedHigh += _queue[_readIndex][0];
                directionLow += _queue[_readIndex][1];
                directionHigh += _queue[_readIndex][2];
                _readIndex = (_readIndex + 1) % kSize;
            }
            // divide by 4 to average
            speedHigh = speedHigh >> 2;
            directionLow = directionLow >> 2;
            directionHigh = directionHigh >> 2;
        }
        if (directionLow < 0 || directionHigh < 0 || directionHigh > speedHigh)
        {
            printf("We didn't see a transition in direction during a full speed rotation, line 169 ultimeter.cpp\r\n");
            printf("speedHigh: %d, directionLow: %d, directionHigh: %d\r\n", speedHigh, directionLow, directionHigh);
            return false;
        }
        return true;
    }

    /** @brief Returns queue distance between read and write indices. */
    uint8_t length() const
    {
        return _writeIndex >= _readIndex ? _writeIndex - _readIndex : kSize + _writeIndex - _readIndex;
    }

private:
    static constexpr uint8_t kSize = 8;
    int16_t _queue[kSize][3];
    uint8_t _readIndex = 0;
    uint8_t _writeIndex = 0;
};

#endif
