/**
 * @file DataFile.cpp
 * @brief Sprinkler configuration file I/O.
 */

#ifdef SPRINKLER_NEW
#include <LittleFS.h>
#include "Report.h"
#include "SprinklerNew/Structs.h"

/**
 * @brief Loads the sprinkler schedule from /data.bin on LittleFS.
 *
 * @return true if the file was read and parsed successfully, false otherwise.
 */
bool loadDataFile()
{
    if (!LittleFS.exists("/data.bin"))
    {
        Report.println("Failed to find data file");
        return false;
    }

    fs::File f = LittleFS.open("/data.bin", "r");
    if (!f)
    {
        Report.println("Failed to open data file");
        return false;
    }

    uint16_t count = 0;
    if (f.read((uint8_t *)&count, sizeof(count)) != sizeof(count))
    {
        Report.println("Data file read failed (count)");
        f.close();
        return false;
    }

    schedule.clear();
    schedule.reserve(count);
    for (uint16_t i = 0; i < count; i++)
    {
        ScheduleItem e;
        if (f.read((uint8_t *)&e, sizeof(e)) != sizeof(e))
        {
            Report.println("Data file read failed (entry)");
            f.close();
            return false;
        }
        schedule.push_back(e);
    }

    f.close();
    Report.printf("Data file loaded: %d entries\n", count);
    return true;
}

/**
 * @brief Saves the sprinkler schedule to /data.bin on LittleFS.
 *
 * @return true if the file was written successfully, false otherwise.
 */
bool saveDataFile()
{
    fs::File f = LittleFS.open("/data.bin", "w");
    if (!f)
    {
        Report.println("Failed to open data file to write");
        return false;
    }

    uint16_t count = (uint16_t)schedule.size();
    f.write((uint8_t *)&count, sizeof(count));
    for (const ScheduleItem &e : schedule)
        f.write((uint8_t *)&e, sizeof(e));

    f.close();
    Report.printf("Data file saved: %d entries\n", count);
    return true;
}

/**
 * @brief Initializes sprinkler system with test data and saves to persistent storage.
 */
void initData()
{
    schedule.clear();

    for (uint8_t ch = 0; ch < NUM_CHANNELS; ch++)
    {
        for (uint8_t d = 0; d < NUM_DAYS; d++)
        {
            if ((ch * NUM_DAYS + d) % 2 == 0)
                continue;
            ScheduleItem e;
            e.channel = ch;
            e.day = d;
            e.duration = 5 + 14 * ch + d;
            e.start = (15 * 60) + 14 * ch + d;
            schedule.push_back(e);
        }
    }

    saveDataFile();
}

#endif
