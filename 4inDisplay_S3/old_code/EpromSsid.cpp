#include <EEPROM.h> // SSID & PW sored in eprom
#include <SD.h>
#include <arduino.h>
#include <WiFi.h>
#include "DebugServer.h"
#include "Serial.h"
#include "Display.h"
#include "EpromSsid.h"
#include "Tabs.h"
#include "Report.h"
#include "SerialMenu.h"
#include "Clock.h"

#define NETWORK_FILE "/networks.txt"

void readNetworkFile()
{
    // Check existence FIRST to avoid the error log
    if (LittleFS.exists(NETWORK_FILE))
    {
        fs::File f = LittleFS.open(NETWORK_FILE, "r");
        if (f && f.available())
        {
            int sel = f.readStringUntil('\n').toInt();
            // skip the first sel-1 lines
            for (int i = 0; i < sel - 1; i++)
            {
                f.readStringUntil('\n');
                f.readStringUntil('\n');
            }

            if (f.available())
            {
                String name = f.readStringUntil('\n');

                // Safety check: make sure there is a password line following the name
                if (f.available())
                {
                    String password = f.readStringUntil('\n');

                    // Clean up whitespace (optional but recommended)
                    name.trim();
                    password.trim();

                    Report.printf("Read: %s / %s\n", name.c_str(), password.c_str());
                }
            }
            f.close();
        }
        else
        {
            Report.println("Failed to open network file for reading");
        }
    }
    else
    {
        Report.println("No network file found for reading, creating it now.");
        fs::File f = LittleFS.open(NETWORK_FILE, "w");
        if (f)
        {
            Report.println("Creating default network file");
            f.println("3");
            f.println("Beelink Secure");
            f.println("1223122312");
            f.println("Thilenius");
            f.println("qwe123qwe");
            f.println("Need4Speed");
            f.println("1223122312");
            f.close();
        }
        else
        {
            Report.println("Failed to create network file");
        }
    }
}

void startEEprom()
{
    readNetworkFile();
    if (!EEPROM.begin(EEPROM_SIZE))
    {
        int i = EEPROM_SIZE;
        Report.printf("Could not initialize EEPROM at %d bytes\r\n", i);
        delay(1000);
        ESP.restart();
    }
}

void scan()
{
    // WiFi.scanNetworks will return the number of networks found

    Report.print("\r\nscanning for networks...");
    int n = WiFi.scanNetworks();
    Report.print(" done");
    if (n == 0)
    {
        Report.print("no networks found");
    }
    else
    {
        String s = String(n) + " networks found\r\n";
        // Print SSID and RSSI for each network found
        for (int i = 0; i < n; ++i)
            s += String(i + 1) + ": " + WiFi.SSID(i) + " (" + WiFi.RSSI(i) + ")" + ((WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "\r\n" : "*\r\n");
        Report.print(s);
    }
}

void listWifis()
{
    uint8_t i = 1;
    uint8_t address = 1;
    Report.print("\n");
    String t = EEPROM.readString(address);
    address += 1 + t.length();
    do
    {
        Report.printf("%d: %s\r\n", i++, t.c_str());
        t = EEPROM.readString(address);
        address += 1 + t.length();
        t = EEPROM.readString(address);
        address += 1 + t.length();
    } while (t.length() > 0);
    Report.print("");
}

uint8_t countWifis()
{
    uint8_t i = 0;
    uint8_t address = 1;
    Report.print("");
    String t = EEPROM.readString(address);
    address += 1 + t.length();
    while (t.length() > 0)
    {
        i++;
        t = EEPROM.readString(address);
        address += 1 + t.length();
        t = EEPROM.readString(address);
        address += 1 + t.length();
    }
    return (i);
}

void initEEprom()
{
    uint8_t address = 1;
    // String t;
    // File myFile;

    // myFile = SD.open("/networks.txt", FILE_WRITE);

    // // if the file opened okay, write to it:
    // if (myFile)
    // {
    //    Report.print("Writing to test.txt...");
    //     myFile.print("Beelink Secure\n1223122312\nThilenius\nqwe123qwe\nNeed4Speed\n1223122312\n");
    //     // close the file:
    //     myFile.close();
    //    Report.print("done.");
    // }
    // else
    // {
    //     // if the file didn't open, print an error:
    //    Report.print("error opening test.txt");
    // }

    // // re-open the file for reading:
    // myFile = SD.open("/networks.txt");
    // if (myFile)
    // {
    //    Report.print("/networks.txt:");

    //     // read from the file until there's nothing else in it:
    //     while (myFile.available())
    //     {
    //         Serial0.write(myFile.read());
    //     }
    //     // close the file:
    //     myFile.close();
    // }
    // else
    // {
    //     // if the file didn't open, print an error:
    //    Report.print("error opening /networks.txt");
    // }

    String t = EEPROM.readString(address);
    if (t.length() > 3 && t.length() < 32)
    {
        address += 1 + t.length();
        t = EEPROM.readString(address);
        if (t.length() > 3 && t.length() < 32)
        {
            Serial0.println("EEPROM already initialized");
            return;
        }
    }
    address = 1;
    EEPROM.writeByte(0, 2); // current index 0-x
    Report.printf("EEPROM size: %d\r\n", EEPROM_SIZE);
    t = "Beelink Secure";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "1223122312";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "Thilenius";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "qwe123qwe";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "Need4Speed";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "1223122312";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    t = "";
    EEPROM.writeString(address, t);
    address += 1 + t.length();
    EEPROM.commit();

    Report.printf("wrote %d bytes\r\n", address);
    Report.printf("selection #%d\r\n", EEPROM.readByte(0));
    address = 1;
    do
    {
        t = EEPROM.readString(address);
        Report.printf("read %s at %d, length = %d\r\n", t.c_str(), address, t.length());
        address += 1 + t.length();
    } while (t.length() > 0);
}

void changeDefaultNetwork()
{
    uint8_t buffer[2];
    Report.print("");

    uint8_t i = countWifis(), cd = EEPROM.readByte(0);
    listWifis();
    Report.printf("enter new default (currently %d) network:", cd + 1);
    int8_t c = 255;
    c = Serial0.read(buffer, 1);
    buffer[0] -= '0';
    while (buffer[0] > i || buffer[0] == 0)
    {
        c = Serial0.read(buffer, 1);
        buffer[0] -= '0';
    }
    Report.print(buffer[0]);
    EEPROM.writeByte(0, buffer[0] - 1);
    EEPROM.commit();
    SerialMenu.printMenu(SERIAL & WEB_SERIAL);
}

void addDefaultNetwork()
{
    char s[32], p[32];
    uint8_t i = 0, j = 0, address = 1;
    Report.printf("New SSID:");
    while (1)
    {
        Serial0.readBytes(&(s[i]), 1);
        if (s[i] == '\r' || s[i] == '\n')
        {
            s[i] = 0;
            Serial0.read(&(s[i + 1]), 1);
            break;
        }
        Report.print(s[i++]);
    }
    Report.printf("\r\nNew Password:");
    while (1)
    {
        Serial0.readBytes(&(p[j]), 1);
        if (p[j] == '\r' || p[j] == '\n')
        {
            p[j] = 0;
            Serial0.read(&(p[j + 1]), 1);
            break;
        }
        Report.print(p[j++]);
    }
    Report.printf("\r\ndone: %s %s\r\n", s, p);
    String t;
    while (1)
    {
        t = EEPROM.readString(address);
        if (t.length() == 0)
            break;
        address += 1 + t.length();
    }
    EEPROM.writeString(address, s);
    address += 1 + i;
    EEPROM.writeString(address, p);
    address += 1 + j;
    EEPROM.writeString(address, "");
    EEPROM.commit();
    SerialMenu.printMenu(SERIAL & WEB_SERIAL);
}

void removeNetwork()
{
    listWifis();
    char c[2];
    Report.printf("enter network to remove:");
    Serial0.readBytes(c, 1);
    c[0] -= '0';
    c[1] = 0;
    Report.print(c);

    uint8_t address = 1, start = 1;
    String t;
    for (uint8_t i = 0; i < c[0]; i++)
    {
        start = address;
        t = EEPROM.readString(address);
        if (t.length() > 0)
        {
            address += 1 + t.length();
            t = EEPROM.readString(address);
            address += 1 + t.length();
        }
        else
        {
            address = 0;
            break;
        }
    }
    if (address)
    {
        t = EEPROM.readString(address);
        while (t.length() > 0)
        {
            EEPROM.writeString(start, t);
            start += 1 + t.length();
            address += 1 + t.length();
            t = EEPROM.readString(address);
            EEPROM.writeString(start, t);
            start += 1 + t.length();
            address += 1 + t.length();
            t = EEPROM.readString(address);
        }
        EEPROM.writeString(start, "");
        EEPROM.commit();
    }
    else
    {
        Report.printf("network %d not found\r\n", c[0]);
    }
    SerialMenu.printMenu(SERIAL & WEB_SERIAL);
}

void getWiFiNetwork()
{
    TabNetwork *tab = (TabNetwork *)tabs->tab[0];
    uint8_t address = 1;
    tab->networkSelected = EEPROM.readByte(0); // current index 0-x
    Serial0.printf("selection #%d\r\n", tab->networkSelected);

    for (uint8_t i = 0; i < 5; i++)
    {
        tab->networks[i].selected = false;
        tab->networks[i].visible = false;
    }
    if (tab->networkSelected <= 5)
        tab->networks[tab->networkSelected].selected = true;

    ssid = EEPROM.readString(address);
    while (ssid.length() > 0)
    {
        address += 1 + ssid.length();
        password = EEPROM.readString(address);
        tab->networks[tab->networkCount].ssid = ssid;
        tab->networks[tab->networkCount++].password = password;
        address += 1 + password.length();
        ssid = EEPROM.readString(address);
    }
    if (tab->scanCount > 0)
        delete[] tab->scanResults;

    // return;
    // tab->scanCount = WiFi.scanNetworks();
    tab->scanCount = 0;
    tab->networks[tab->networkSelected].visible = true;

    if (tab->scanCount > 0)
    {
        tab->scanResults = new ScanResult[tab->scanCount];
        for (uint8_t i = 0; i < tab->scanCount; i++)
        {
            tab->scanResults[i].ssid = WiFi.SSID(i);
            tab->scanResults[i].rssi = WiFi.RSSI(i);
            for (uint8_t j = 0; j < tab->networkCount; j++)
            {
                if (tab->scanResults[i].ssid == tab->networks[j].ssid)
                {
                    tab->networks[j].visible = true;
                    tab->networks[j].rssi = tab->scanResults[i].rssi;
                }
            }
        }
    }
    ssid = tab->networks[tab->networkSelected].ssid;
    password = tab->networks[tab->networkSelected].password;
    // Serial0.printf("ssid: %s, password: %s\r\n", ssid.c_str(), password.c_str());

    if (tab->networks[tab->networkSelected].visible)
        return;

    for (uint8_t i = 0; i < tab->networkCount; i++)
    {
        if (tab->networks[i].visible)
        {
            tab->networks[tab->networkSelected].selected = false;
            tab->networks[i].selected = true;
            ssid = tab->networks[i].ssid;
            password = tab->networks[i].password;
            tab->networkSelected = i;
            EEPROM.writeByte(0, i);
            EEPROM.commit();
            return;
        }
    }
}

void saveNextShot(uint64_t n)
{
    // get the current timestamp

    EEPROM.writeULong64(EEPROM_SIZE - 1 - 8, n);
    EEPROM.commit();
}

long getNextShot()
{
    return EEPROM.readULong64(EEPROM_SIZE - 1 - 8);
}