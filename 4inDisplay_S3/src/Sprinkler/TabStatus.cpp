/**
 * @file TabStatus.cpp
 * @brief Sprinkler status tab implementation.
 */

#ifdef SPRINKLER
#include "Tabs.h"
#include "Sprinkler/Sprinkler.h"
#include "Sprinkler/TabStatus.h"
#include "Sprinkler/Structs.h"
#include "Report.h"
#include "Buzzer.h"
#include "Button.h"
#include "Sprinkler/TabStatusStructs.h"

struct Channel Days[NUM_DAYS] = {
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(109, 97, 167)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(6, 128, 205)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(51, 100, 130)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(205, 153, 177)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(121, 177, 165)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(77, 133, 120)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(93, 132, 183)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(152, 106, 107)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(250, 125, 117)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(133, 175, 212)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(183, 131, 5)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(148, 100, 86)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(174, 165, 126)},
    {{0, 0}, {0, 0}, {"", ""}, rgbTo565(186, 124, 97)}};

//! Column headers
const char *headers[6] = {"Chan", "Start", "Stop", "Dur.", "Skip", "Remove"};
const char *chLabels[6] = {"PUMP", "CH1", "CH2", "CH3", "CH4", "CH5"};

const char *dayLabels[] = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
const char *fullDayLabels[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

/**
 * @brief Constructs the Sprinkler status tab.
 *
 * @param tft Pointer to the TFT display driver.
 */
TabStatus::TabStatus(TFT_eSPI *tft) : Tab()
{
    name = "Status";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;

    availableHeight = _tft->height() - TAB_H + CORNER_RADIUS;
    availableWidth = _tft->width();
    top = TAB_H - CORNER_RADIUS + 1;
    middle = top + availableHeight / 2;
    bottom = _tft->height() - 1;

    month = boundary.boundaryInfo.tm_mon + 1; //!< tm_mon is 0-11
    day = boundary.boundaryInfo.tm_mday;
    for (int i = 0; i < NUM_DAYS; i++)
    {
        Days[i].position.x = (i % 7) * (_tft->width() - 1) / 7;
        Days[i].position.y = i < 7 ? top : middle;
        Days[i].size.width = (i % 7 + 1) * (_tft->width() - 1) / 7 - Days[i].position.x - 1;
        Days[i].size.height = i < 7 ? (middle - top - 1) : (bottom - middle - 1);
        Days[i].date.day[0] = '0' + (day / 10);
        Days[i].date.day[1] = '0' + (day % 10);
        Days[i].date.day[2] = '\0';
        Days[i].date.month[0] = '0' + (month / 10);
        Days[i].date.month[1] = '0' + (month % 10);
        Days[i].date.month[2] = '\0';
        addDay();
    }
    resetBoundary();
    day = -1;

    //! Create back button
    backButton = new Button(_tft, availableWidth - 100, 4 + TAB_H - CORNER_RADIUS,
                            80, 30, "Back", TFT_CYAN, TFT_BLACK,
                            [this]()
                            {
                                day = -1;
                                drawSummary();
                            });
}

/**
 * @brief Sets the 14-day boundary data and marks the tab for redraw.
 *
 * @param boundary The boundary data to apply.
 */
void TabStatus::SetBoundary(BoundaryData boundary)
{
    this->boundary = boundary;
    //! Report.println(&boundaryInfo, "%A, %B %d %Y %H:%M:%S zone %Z %z ");
    changed = true;
}

/**
 * @brief Advances the boundary date by one day and updates month/day fields.
 */
void TabStatus::addDay()
{
    boundary.boundaryInfo.tm_mday += 1;
    mktime(&boundary.boundaryInfo);
    month = boundary.boundaryInfo.tm_mon + 1; //!< tm_mon is 0-11
    day = boundary.boundaryInfo.tm_mday;
}

/**
 * @brief Resets the boundary display state (stub).
 */
void TabStatus::resetBoundary()
{
}

/**
 * @brief Draws a single day cell in the summary calendar view.
 *
 * @param day Day index within the 14-day cycle.
 */
void TabStatus::drawDay(int day)
{
    _tft->setTextFont(1);
    char dateStr[12];
    snprintf(dateStr, sizeof(dateStr), "%s %s/%s", dayLabels[day % 7], Days[day].date.month, Days[day].date.day);
    _tft->drawString(dateStr, Days[day].position.x + 5, Days[day].position.y + 5);

    int pos = Days[day].position.y + 38;
    int step = (middle - top - 38) / 6.1;
    for (int j = 0; j < 6; j++)
    {
        int x = Days[day].position.x + 10 + (_tft->width() - 1) / 14;
        _tft->drawString(chLabels[j], x - 30, pos - 3);
        bool enabled = false;
        for (const ScheduleItem &e : schedule)
            if (e.channel == (uint8_t)j && e.day == (uint8_t)day)
            {
                enabled = true;
                break;
            }
        if (enabled)
        {
            _tft->fillCircle(x, pos, 6, rgbTo565(220, 255, 220));
            _tft->drawLine(x - 3, pos + 1, x, pos + 4, TFT_DARKGREEN);
            _tft->drawLine(x - 2, pos + 0, x + 1, pos + 3, TFT_DARKGREEN);
            _tft->drawLine(x, pos + 4, x + 3, pos - 3, TFT_DARKGREEN);
            _tft->drawLine(x, pos + 3, x + 3, pos - 4, TFT_DARKGREEN);
        }
        else
            _tft->fillCircle(x, pos, 6, rgbTo565(200, 200, 200));
        pos += step;
    }
}

/**
 * @brief Draws either the summary calendar or the detail view for the selected day.
 */
void TabStatus::draw()
{
    changed = false;

    if (day < 0 || day >= NUM_DAYS)
        drawSummary();
    else
        drawDetails();
}

/**
 * @brief Draws the 14-day summary calendar showing all days with channel status indicators.
 */
void TabStatus::drawSummary()
{
    _tft->fillRect(0, Days[0].position.y, availableWidth, availableHeight, bgColor);

    for (int i = 0; i < NUM_DAYS; i++)
        _tft->fillRect(Days[i].position.x + 1, Days[i].position.y + 1, Days[i].size.width, Days[i].size.height, Days[i].color);

    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextFont(1);

    for (int i = 0; i < NUM_DAYS; i++)
        drawDay(i);
}

/**
 * @brief Draws the detailed schedule table for the currently selected day.
 */
void TabStatus::drawDetails()
{
    Report.printf("Draw details for day %d\n", day);
    _tft->fillRect(0, Days[0].position.y, availableWidth, availableHeight, TFT_BLACK);

    //! Back button
    backButton->draw();

    //! details
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextFont(1);

    char str[32];
    snprintf(str, sizeof(str), "Details for %s %s/%s", fullDayLabels[day % 7], Days[day].date.month, Days[day].date.day);
    _tft->drawString(str, 10, Days[0].position.y + 10);

    //! Define table area
    int tableTop = 38 + TAB_H - CORNER_RADIUS;
    int tableBottom = _tft->height();
    int tableLeft = 0;
    int tableRight = _tft->width();

    int tableWidth = tableRight - tableLeft;
    int tableHeight = tableBottom - tableTop;

    //! Calculate cell dimensions (7 rows, 6 columns)
    int cellWidth = tableWidth / 6;
    int cellHeight = tableHeight / 7;

    tableWidth = 6 * cellWidth;
    tableHeight = 7 * cellHeight;
    tableRight = tableLeft + tableWidth;

    //! Draw table grid lines
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextDatum(TL_DATUM);

    //! Draw horizontal lines (8 lines for 7 rows)
    for (int i = 0; i <= 7; i++)
    {
        int y = tableTop + i * cellHeight;
        _tft->drawLine(tableLeft, y, tableRight, y, TFT_WHITE);
    }

    //! Draw vertical lines (7 lines for 6 columns)
    for (int i = 0; i <= 6; i++)
    {
        int x = tableLeft + i * cellWidth;
        _tft->drawLine(x, tableTop, x, tableBottom, TFT_WHITE);
    }

    //! Fill header row
    for (int col = 0; col < 6; col++)
    {
        int x = tableLeft + col * cellWidth + 5;
        int y = tableTop + 5;
        _tft->drawString(headers[col], x, y);
    }

    //! Fill first column with channel labels
    for (int row = 1; row < 7; row++)
    {
        int x = tableLeft + 5;
        int y = tableTop + row * cellHeight + 5;
        _tft->drawString(chLabels[row - 1], x, y);

        //! Fill in data for this channel and day
        int channelIndex = row - 1;

        //! Find first schedule entry for this channel and day
        const ScheduleItem *entry = nullptr;
        for (const ScheduleItem &e : schedule)
            if (e.channel == (uint8_t)channelIndex && e.day == (uint8_t)day)
            {
                entry = &e;
                break;
            }

        int startMinutes = entry ? entry->start : 0;
        int durationMin = entry ? entry->duration : 0;

        //! Start time (column 1)
        char startStr[8];
        snprintf(startStr, sizeof(startStr), "%02d:%02d", startMinutes / 60, startMinutes % 60);
        _tft->drawString(startStr, tableLeft + 1 * cellWidth + 5, y);

        //! Stop time (column 2)
        char stopStr[8];
        int stopMinutes = startMinutes + durationMin;
        snprintf(stopStr, sizeof(stopStr), "%02d:%02d", stopMinutes / 60, stopMinutes % 60);
        _tft->drawString(stopStr, tableLeft + 2 * cellWidth + 5, y);

        //! Duration (column 3)
        char durationStr[8];
        snprintf(durationStr, sizeof(durationStr), "%d min", durationMin);
        _tft->drawString(durationStr, tableLeft + 3 * cellWidth + 5, y);

        //! Skip status (column 4)
        const char *skipStr = entry ? "No" : "Yes";
        _tft->drawString(skipStr, tableLeft + 4 * cellWidth + 5, y);

        //! Remove button (column 5)
        _tft->fillRoundRect(tableLeft + 5 * cellWidth + 10, y - 2,
                            cellWidth - 20, cellHeight - 10, 3, TFT_RED);
        _tft->setTextColor(TFT_WHITE);
        _tft->drawString("DEL", tableLeft + 5 * cellWidth + 20, y + 2);
        _tft->setTextColor(TFT_WHITE);
    }
}

/**
 * @brief Handles touch events on the status tab.
 *
 * In summary view, selects a day. In detail view, handles back button and actions.
 *
 * @param x Touch x coordinate.
 * @param y Touch y coordinate.
 * @param lastClick Milliseconds since the last touch event.
 */
void TabStatus::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    if (lastClick > 500)
    {

        if (day >= 0 && day < NUM_DAYS)
        {
            //! Check back button
            if (backButton->handle(x, y))
                return;

            //! Check delete buttons
            // for (int i = 0; i < 6; i++)
            // {
            //     if (deleteButtons[i]->handle(x, y))
            //         return;
            // }
        }
        else
        {
            Report.println("day selected");
            quickBeep();
            int col = x / (availableWidth / 7);
            int row = (y - top) / (availableHeight / 2);
            day = 7 * row + col;
            drawDetails();
        }
    }
}

/**
 * @brief Periodic loop for the status tab (currently unused).
 */
void TabStatus::loop()
{
}

#endif
