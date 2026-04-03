
#include <Arduino.h>
#include <LittleFS.h>
#include <SD.h>
using fs::FS;
#include "Report.h"
#include "FileSystem.h"
#include "Memory.h"

/**
 * @file FileSystem.cpp
 * @brief Filesystem listing and partition helpers.
 */

/**
 * @brief Recursively lists files in a directory.
 *
 * @param fs Filesystem reference
 * @param dirname Path to directory
 * @param levels Recursion depth
 * @param str String buffer to append output to
 */
void listDir(fs::FS &fs, const char *dirname, uint8_t levels, String &str, uint8_t depth = 0)
{
    if (depth == 0)
    {
        str += "Listing directory: ";
        str += dirname;
        str += "\r\n";
    }

    File root = fs.open(dirname);
    if (!root)
    {
        str += "− failed to open directory\r\n";
        return;
    }
    if (!root.isDirectory())
    {
        str += " − not a directory\r\n";
        return;
    }

    File file = root.openNextFile();

    while (file)
    {
        String indent = "";
        for (int i = 0; i < depth; i++)
        {
            indent += "  ";
        }

        if (file.isDirectory())
        {
            str += indent;
            str += "  DIR : ";
            str += file.name();
            str += "\r\n";
            if (levels)
            {
                listDir(fs, file.path(), levels - 1, str, depth + 1);
            }
        }
        else
        {
            String temp = indent + "  FILE: " + String(file.name());
            str += temp;
            int padding = 50 - temp.length();
            if (padding < 1)
                padding = 1;

            for (int i = 0; i < padding; i++)
            {
                str += " ";
            }

            if (file.size() < 1024)
            {
                str += String(file.size());
                str += " B";
            }
            else if (file.size() < (1024 * 1024))
            {
                str += String(file.size() / 1024.0, 2);
                str += " KB";
            }
            else
            {
                str += String(file.size() / (1024.0 * 1024.0), 2);
                str += " MB";
            }
            str += "\r\n";
        }
        file = root.openNextFile();
    }
}

void printPartitionTable()
{
    printf("ESP32 Partition table:\n\n");

    printf("| Type | Sub |  Offset  |   Size   |       Label      |\n");
    printf("| ---- | --- | -------- | -------- | ---------------- |\n");

    esp_partition_iterator_t pi = esp_partition_find(ESP_PARTITION_TYPE_ANY, ESP_PARTITION_SUBTYPE_ANY, NULL);

    if (pi != NULL)
    {
        do
        {
            const esp_partition_t *p = esp_partition_get(pi);
            printf("|  %02x  | %02x  | 0x%06X | 0x%06X | %-16s |\r\n",
                   p->type, p->subtype, p->address, p->size, p->label);
        } while (pi = (esp_partition_next(pi)));
    }
}

void fileSystemInfo()
{

    String str = "";
    listDir(LittleFS, "/", 2, str);
    Report.print(str);
}

static FileInfo *fsFilesCache = NULL;

void cacheFiles()
{
    if (fsFilesCache != NULL)
    {
        delete[] fsFilesCache;
        fsFilesCache = NULL;
    }

    uint16_t fileCount = 0;
    File root = LittleFS.open("/");
    File file = root.openNextFile();
    while (file)
    {
        fileCount++;
        file = root.openNextFile();
    }

    fsFilesCache = new FileInfo[fileCount + 1];
    root = LittleFS.open("/");
    file = root.openNextFile();
    int index = 0;
    while (file)
    {
        fsFilesCache[index].name = file.name();
        fsFilesCache[index].size = file.size();
        file = root.openNextFile();
        index++;
    }
    fsFilesCache[index].name = "";
}

FileInfo *getFiles()
{
    if (fsFilesCache == NULL)
    {
        fsFilesCache = new FileInfo[1];
        fsFilesCache[0].name = "";
    }
    return fsFilesCache;
}

static FileInfo *sdFilesCache = NULL;

void cacheSDFiles()
{
    if (sdFilesCache != NULL)
    {
        delete[] sdFilesCache;
        sdFilesCache = NULL;
    }

    if (!sdCardMounted)
    {
        sdFilesCache = new FileInfo[1];
        sdFilesCache[0].name = "";
        return;
    }

    uint16_t fileCount = 0;
    File root = SD.open("/");
    File file = root.openNextFile();
    while (file)
    {
        if (!file.isDirectory()) fileCount++;
        file = root.openNextFile();
    }

    sdFilesCache = new FileInfo[fileCount + 1];
    root = SD.open("/");
    file = root.openNextFile();
    int index = 0;
    while (file)
    {
        if (!file.isDirectory())
        {
            sdFilesCache[index].name = file.name();
            sdFilesCache[index].size = file.size();
            index++;
        }
        file = root.openNextFile();
    }
    sdFilesCache[index].name = "";
}

FileInfo *getSDFiles()
{
    if (sdFilesCache == NULL)
    {
        sdFilesCache = new FileInfo[1];
        sdFilesCache[0].name = "";
    }
    return sdFilesCache;
}
