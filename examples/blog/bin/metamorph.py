#!/usr/bin/python
#
# Last Modification: 2024-04-10 20:39:05
#
import sys
import os
import json
import copy
import shutil
from datetime import datetime
from slugify import slugify
from argparse import ArgumentParser

def divide_chunks(l, n): 
    # looping till length l 
    for i in range(0, len(l), n):  
        yield l[i:i + n]

def sort_dict_by_value(d, reverse = False):
    return dict(sorted(d.items(), key = lambda x: x[1], reverse = reverse))

def dump_json_file(json_data, json_file, remove = True):
    if remove and os.path.exists(json_file):
        os.remove(json_file)

    with open(json_file, "w") as outfile: 
        json.dump(json_data, outfile, indent=4)

class GenJsonFiles(object):
    def __init__(self, data_dir):
        self.__posts = []
        self.__categories = {}
        self.__archives = {}
    
        if not os.path.exists(data_dir):
            print('The data directory "{}" not exist!'.format(data_dir))
            exit(0)

        raw_dir = os.path.join(data_dir, 'raw')
        if not os.path.exists(raw_dir):
            print('The raw directory "{}" not exist!'.format(raw_dir))
            exit(0)

        self.__data_dir = data_dir
        self.__raw_dir = raw_dir

        self.__chunks = 6

        self.__most_read_json_file = "most-read.json"
        self.__recent_posts_json_file = "recent-posts.json"
        self.__featured_post_json_file = "featured-post.json"
        self.__featured_posts_json_file = "featured-posts.json"
        self.__archives_json_file = "archives.json"
        self.__elsewhere_json_file = "elsewhere.json"
        self.__nav_bar_json_file = "navbar.json"

    def __del__(self):
        self.__posts.clear()
        self.__categories.clear()
        self.__archives.clear()

    def __order_by_recent_posts(self, posts):
        temp = {}
        for index, post in enumerate(posts):
            temp[index] = post['date_created']
        
        # print('Temp:', temp)
        result = sort_dict_by_value(temp, True)

        # print('Result:', result)
        indexes = list(result.keys())
        for index in indexes:
            # print('Pos:', posts[index])
            self.__posts.append(posts[index])

    def __get_raw_posts_from_dir(self):
        posts = []
        for json_file in os.listdir(self.__raw_dir):
            if json_file.endswith(".json"):
                # print(json_file)
                f = open(os.path.join(self.__raw_dir, json_file))
                data = json.load(f)
                # print(data)
                posts.append(data)
                f.close()
        self.__order_by_recent_posts(posts)

    def __get_categories(self):

        self.__categories['all'] = {
            'category': 'Most Recent',
            'posts': []
        }
        for post in self.__posts:
            category_slug = slugify(post['category'])
            if category_slug not in self.__categories:
                self.__categories[category_slug] = {
                    'category': post['category'],
                    'posts': []
                }

            post = {
                "id": post['id'],
                "category": post['category'],
                "date_created": post['date_created'],
                "title": post['title'],
                "excerpt": post['excerpt'],
                "permalink": post['permalink'],
                "author": post['author']
            }

            self.__categories[category_slug]['posts'].append(post)
            self.__categories['all']['posts'].append(post)

    def paginate_categories(self):
        categories_dir = os.path.join(self.__data_dir, 'categories')
        if os.path.exists(categories_dir):
            shutil.rmtree(categories_dir)
        os.mkdir(categories_dir)

        for category_slug in self.__categories:
            category_dir = os.path.join(self.__data_dir, 'categories', category_slug)
            os.mkdir(category_dir)
            # print(category_slug)

            chunks_list = list(divide_chunks(self.__categories[category_slug]['posts'], self.__chunks))
            for index, chunk in enumerate(chunks_list):
                page = index + 1
                category = {
                    "nav": {
                        "prev": page - 1 if page - 1 > 0 else 0,
                        "next": page + 1 if page + 1 <= len(chunks_list) else 0
                    },
                    "category": self.__categories[category_slug]['category'],
                    "category_slug": category_slug,
                    "posts": chunk
                }

                json_file = os.path.join(category_dir, '%d.json' % page)
                dump_json_file(category, json_file)
                print('src-data path to "Category Posts": {}'.format(json_file))


    def __get_archives(self):
        for post in self.__posts:

            d = datetime.strptime(post['date_created'], "%Y-%m-%dT%H:%M:%S")
            archive_month = d.strftime("%Y-%m")

            if archive_month not in self.__archives:
                self.__archives[archive_month] = {
                    'archive': archive_month,
                    'posts': []
                }

            post = {
                "id": post['id'],
                "category": post['category'],
                "date_created": post['date_created'],
                "title": post['title'],
                "excerpt": post['excerpt'],
                "permalink": post['permalink'],
                "author": post['author']
            }

            self.__archives[archive_month]['posts'].append(post)


    def paginate_archives(self):
        archives_dir = os.path.join(self.__data_dir, 'archives')
        if os.path.exists(archives_dir):
            shutil.rmtree(archives_dir)
        os.mkdir(archives_dir)

        for archive in self.__archives:
            archives_dir = os.path.join(self.__data_dir, 'archives', archive)
            os.mkdir(archives_dir)
            # print(archives_dir)

            chunks_list = list(divide_chunks(self.__archives[archive]['posts'], self.__chunks))
            for index, chunk in enumerate(chunks_list):
                page = index + 1
                archive = {
                    "nav": {
                        "prev": page - 1 if page - 1 > 0 else 0,
                        "next": page + 1 if page + 1 <= len(chunks_list) else 0
                    },
                    "archive": archive,
                    "posts": chunk
                }

                json_file = os.path.join(archives_dir, '%d.json' % page)
                dump_json_file(archive, json_file)
                print('src-data path to "Archive Posts": {}'.format(json_file))


    def json_file_navbar(self):
        # print(self.__categories)

        keys = list(self.__categories.keys())
        keys.sort()

        posts = []
        for category_slug in keys:
            posts.append({
                "category": self.__categories[category_slug]['category'],
                "category_slug": category_slug,
                "page": 1
            })

            json_file = os.path.join(self.__data_dir, self.__nav_bar_json_file)
            dump_json_file(posts, json_file)
            print('src-data path to "Nav bar Posts": {}'.format(json_file))

    #
    # scr-data to featured post template
    #
    def json_file_featured_post(self, id = 0, light = False):

        def get_post(id_post):
            for post in self.__posts:
                if post['id'] == id_post:
                    return post

        post = self.__posts[id] if id == 0 else get_post(id)
        
        json_file = os.path.join(self.__data_dir, self.__featured_post_json_file)
        dump_json_file({
            "id": post['id'],
            "category": post['category'],
            "title": post['title'],
            "excerpt": post['excerpt'],
            "image": post['image'],
            "permalink": post['permalink'],
            "light": light
        }, json_file)
        print('src-data path to "Featured Post": {}'.format(json_file))

    #
    # scr-data to featured posts template
    #
    def json_file_featured_posts(self):
        posts = []
        for post in self.__posts:
            if post['featured']:
                posts.append({
                    "id": post['id'],
                    "category": post['category'],
                    "date_created": post['date_created'],
                    "title": post['title'],
                    "excerpt": post['excerpt'],
                    "image": post['image'],
                    "permalink": post['permalink'],
                    "author": post['author']
                })
                if len(posts) == 2:
                    break

        json_file = os.path.join(self.__data_dir, self.__featured_posts_json_file)
        dump_json_file(posts, json_file)
        print('src-data path to "Featured Posts": {}'.format(json_file))

    #
    # scr-data to recent posts template
    #
    def json_file_recent_posts(self):
        recent_posts = {
            "title": "Recent Posts",
            "posts": self.__posts[:len(self.__posts) if len(self.__posts) <= 3 else 3]
        }
        # print(recent_posts)
            
        json_file = os.path.join(self.__data_dir, self.__recent_posts_json_file)
        dump_json_file(recent_posts, json_file)
        print('src-data path to "Recent Posts": {}'.format(json_file))

    #
    # scr-data to most read template
    #
    def json_file_most_read(self):
        temp = {}
        for index, post in enumerate(self.__posts):
            temp[index] = post['views']

        most_read = {
            "title": "Most Read",
            "posts": []
        }
        result = sort_dict_by_value(temp, True)
        for index in result:
            most_read["posts"].append({
                "id": self.__posts[index]["id"],
                "date_created": self.__posts[index]["date_created"],
                "title": self.__posts[index]["title"],
                "image": self.__posts[index]["image"],
                "permalink": self.__posts[index]["permalink"]
            })
            if len(most_read["posts"]) == 3:
                break
        # print(most_read)
        
        json_file = os.path.join(self.__data_dir, self.__most_read_json_file)
        dump_json_file(most_read, json_file)
        print('src-data path to "Most Read": {}'.format(json_file))

    #
    # scr-data to archives template
    #
    def json_file_archives(self):
        # print(self.__archives)

        # keys = list(self.__archives.keys())
        # keys.sort()

        posts = []
        for archive in self.__archives:
            posts.append({
                "archive": archive,
                "page": 1
            })

            json_file = os.path.join(self.__data_dir, self.__archives_json_file)
            dump_json_file(posts, json_file)
            print('src-data path to "Archives": {}'.format(json_file))


    #
    # scr-data to elsewhere template
    #
    def json_file_elsewhere(self, data):
        json_file = os.path.join(self.__data_dir, self.__elsewhere_json_file)
        dump_json_file(data, json_file)
        print('src-data path to "Elsewhere": {}'.format(json_file))

    #
    # scr-data to paginate recent posts template
    #
    def paginate_recent_posts(self):

        posts_dir = os.path.join(self.__data_dir, 'posts')
        if os.path.exists(posts_dir):
            shutil.rmtree(posts_dir)
        os.mkdir(posts_dir)

        for index, post in enumerate(self.__posts):
            # print('index:', index, 'post', post)
            post = copy.deepcopy(self.__posts[index])

            prev_index = index - 1 if index - 1 >= 0 else len(self.__posts) - 1
            next_index = index + 1 if index + 1 < len(self.__posts) else 0

            # print('Index:', index,
            #     'Current:', self.__posts[index]['id'],
            #     'Prev:', self.__posts[prev_index]['id'],
            #     'Next:', self.__posts[next_index]['id'])

            post['nav'] = {
                "previous": self.__posts[prev_index]['id'],
                "next": self.__posts[next_index]['id']
            }
            # print(post)
            
            json_file = os.path.join(self.__data_dir, "posts",
                                     "%d.json" % self.__posts[index]['id'])
            dump_json_file(post, json_file)
            print('src-data path to "Most Recent Posts": {}'.format(json_file))


    def init(self):
        self.__get_raw_posts_from_dir()
        self.__get_categories()
        self.__get_archives()

def main(args):

    parser = ArgumentParser(description="Generate data from the indicated directory")
    parser.add_argument("-d", "--directory", type=str,
                        default="public/data",
                        help="Path to the data directory")
    args = parser.parse_args()

    if not os.path.exists(args.directory):
        print(f'The data "{args.directory}" directory not exists!')
        return 0

    print(f'The JSON files containing the source data were generated from the "{args.directory}" directory.')

    gen = GenJsonFiles(args.directory)
    gen.init()
    gen.paginate_recent_posts()
    gen.paginate_categories()
    gen.paginate_archives()

    gen.json_file_navbar()
    gen.json_file_most_read()
    gen.json_file_recent_posts()
    gen.json_file_featured_posts()
    gen.json_file_archives()
    gen.json_file_featured_post(9, True)
    gen.json_file_elsewhere([
        {
            "name": "GitHub",
            "permalink": "#"
        },
        {
            "name": "Twitter",
            "permalink": "#"
        },
        {
            "name": "Facebook",
            "permalink": "#"
        }
    ])

    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv))