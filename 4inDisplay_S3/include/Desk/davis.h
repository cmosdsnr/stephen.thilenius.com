/**
 * @file davis.h
 * @brief Notes on Davis anemometer wiring.
 */

// davis anemometer
// red-yellow 22k

// For Davis weather sensors, the typical wiring on the anemometer cable is as follows:
// Red: Supplies the +5V power to the sensor circuitry
// Black: Serves as the common ground
// Yellow: Carries the wind speed output as a pulse signal (each pulse corresponds to a rotation of the anemometer cups)
// Green: Provides the wind direction output as a variable voltage (reflecting the vane’s orientation)