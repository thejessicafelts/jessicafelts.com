var fs           = require('fs')  // file system, used to load the text content
var gulp         = require('gulp')
var connect      = require('gulp-connect')
var modRewrite   = require('connect-modrewrite') // allow rewrites that mirror htaccess
var sass         = require('gulp-sass') // Calling the gulp-sass plugin
var useref       = require('gulp-useref') // Allows concatenation to a single place (Useful for Distribution folder)
var imagemin     = require('gulp-imagemin') // Used to optimized our images
var autoprefixer = require('gulp-autoprefixer') // applies CSS vendor prefixesvar cache
var cache        = require('gulp-cache') // Being used in conjunction to imagemin
var del          = require('del') // Used to clean up files
var runSequence  = require('run-sequence') // Allows you to run task in a certain sequence
var plumber      = require('gulp-plumber') // keeps pipes working even when error happens
var notify       = require('gulp-notify') // system notification when error happens
var rename       = require('gulp-rename') // renames files
var concat       = require('gulp-concat') // concatenate scripts
var jshint       = require('gulp-jshint') // catches errors in javascript
var stylish      = require('jshint-stylish') // makes lint errors look nicer
var handlebars   = require('gulp-compile-handlebars') // compile handlebars templates
var gutil        = require('gulp-util')

var paths = {
    // styles:    ['./src/scss/**/*'],
    // scripts:   ['./src/js/**/*'],
    // pages:     ['./src/html/pages/**/*'],
    partials:     './app/partials/**/*',
    // helpers:   './app/helpers/**/*',
    // images:    ['./src/img/**/*.+(png|jpg|jpeg|gif)'],
    // content:   './app/content-prod.json',
    content:      './app/content.json',
    brand:        './app/data/brand.json',
    dist:         './dist'
}

/*

███████╗████████╗██╗   ██╗██╗     ███████╗███████╗
██╔════╝╚══██╔══╝╚██╗ ██╔╝██║     ██╔════╝██╔════╝
███████╗   ██║    ╚████╔╝ ██║     █████╗  ███████╗
╚════██║   ██║     ╚██╔╝  ██║     ██╔══╝  ╚════██║
███████║   ██║      ██║   ███████╗███████╗███████║
╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚══════╝╚══════╝

*****************************************************/

gulp.task('sass', function(){

    var sassError = function(err){
        notify.onError({
            title:    err.relativePath,
            subtitle: 'Line '+err.line,
            message:  '<%= error.messageOriginal %>'
        })(err)
        this.emit('end')
    }

    gulp.src('./app/scss/styles.scss')
        .pipe(plumber({
                errorHandler: sassError
        }))
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(autoprefixer({
            browsers: ['last 10 versions'],
            cascade: false
        }))
        .pipe(rename('styles.css'))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())
})
/*

██╗  ██╗████████╗███╗   ███╗██╗
██║  ██║╚══██╔══╝████╗ ████║██║
███████║   ██║   ██╔████╔██║██║
██╔══██║   ██║   ██║╚██╔╝██║██║
██║  ██║   ██║   ██║ ╚═╝ ██║███████╗
╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝

*************************************/

// check content  object for JSON errors
gulp.task('lint-content',function(){
    return gulp.src(paths.content)
        .pipe(plumber())
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify(function (file) {  // Use gulp-notify as jshint reporter
            if (file.jshint.success) {
                return false // Don't show something if success
            }
            var errors = file.jshint.results.map(function (data) {
                if (data.error) {
                    return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason
                }
            }).join("\n")
            return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors
        }))
})

gulp.task('html',['lint-content','images'], function () {
    console.log('paths.content', paths.content);
    var content = JSON.parse(fs.readFileSync(paths.content,'utf8'));

    var handlebarsError = function(err){
        notify.onError({
            title:    'Handlebars Error',
            message:  '<%= error.message %>'
        })(err)
        console.log(err)
        this.emit('end')
    }

    // handlebars compile options
    var options = {
        batch : ['./app/partials'], // batch is the path to the partials
        knownHelpers : true,
        helpers : {
          list: function(context, options) {
            var ret = "<ul>";
            for(var i=0, j=context.length; i<j; i++) {
              ret = ret + "<li>" + options.fn(context[i]) + "</li>";
            }
            return ret + "</ul>";
          }
        }
    }

    return gulp.src('./app/html/**/*.html')
        .pipe(plumber({errorHandler: handlebarsError}))
        .pipe(handlebars(content, options))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())

})

gulp.task('copy', function() {
    gulp.src('./app/.htaccess')
        .pipe(gulp.dest(paths.dist))
    });

gulp.task('scripts', ['lint'], function(){
    return gulp.src([
            './app/js/lib/jquery-1.10.1.min.js',
            './app/js/lib/*.js',
            './app/js/model/*.js',
            './app/js/common/*.js',
            './app/js/home/*.js',
            './app/js/article/*.js',
            './app/js/masthead/*.js',
            './app/js/*.js'
        ])
        .pipe(concat('main.js'))
        .pipe(gulp.dest(paths.dist))
        .pipe(connect.reload())
})

gulp.task('articles', function(){
    return gulp.src('./app/article/**')
        .pipe(gulp.dest(paths.dist+'/article'))
        .pipe(connect.reload())
})

gulp.task('lint',function(){
    return gulp.src('./app/js/*.js')
        .pipe(plumber())
        .pipe(jshint({
            'asi':true // allows missing semicolons
        }))
        .pipe(jshint.reporter('jshint-stylish'))
        .pipe(notify(function (file) {  // Use gulp-notify as jshint reporter
            if (file.jshint.success) {
                return false // Don't show something if success
            }
            var errors = file.jshint.results.map(function (data) {
                if (data.error) {
                    return "(" + data.error.line + ':' + data.error.character + ') ' + data.error.reason
                }
            }).join("\n")
            return file.relative + " (" + file.jshint.results.length + " errors)\n" + errors
        }))
})

/*

██╗ ███╗   ███╗  █████╗   ██████╗  ███████╗ ███████╗
██║ ████╗ ████║ ██╔══██╗ ██╔════╝  ██╔════╝ ██╔════╝
██║ ██╔████╔██║ ███████║ ██║  ███╗ █████╗   ███████╗
██║ ██║╚██╔╝██║ ██╔══██║ ██║   ██║ ██╔══╝   ╚════██║
██║ ██║ ╚═╝ ██║ ██║  ██║ ╚██████╔╝ ███████╗ ███████║
╚═╝ ╚═╝     ╚═╝ ╚═╝  ╚═╝  ╚═════╝  ╚══════╝ ╚══════╝

****************************************************/

gulp.task('images', function(){ // task to help optimize images
    return gulp.src('app/images/**/*.+(png|PNG|jpg|jpeg|gif)')
    // Caching images that ran through imagemin
    .pipe(cache(imagemin({
            interlaced: true
        })))
    .pipe(gulp.dest(paths.dist+'/images'))
})

/*

██╗   ██╗██╗██████╗ ███████╗ ██████╗ ███████╗
██║   ██║██║██╔══██╗██╔════╝██╔═══██╗██╔════╝
██║   ██║██║██║  ██║█████╗  ██║   ██║███████╗
╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║   ██║╚════██║
 ╚████╔╝ ██║██████╔╝███████╗╚██████╔╝███████║
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝


****************************************************/

gulp.task('videos', function(){ // task to help optimize images
    return gulp.src('app/videos/**/*')
    .pipe(gulp.dest(paths.dist+'/videos'))
})

/*

███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗
██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗
███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝
╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗
███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║
╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝

****************************************************/

var cors = function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'headers_you_want_to_accept');
  next();
};

// rewrite requests to the corresponding HTML files
var rewrite = modRewrite([
    '^/article/(.*)$ /article/$1.html'
])

gulp.task('connectDist', function () {
    connect.server({
        root: paths.dist,
        port: 8008,
        livereload: true,
        middleware: function () {
            return [cors];
        }
    })
})

/*

██╗    ██╗ █████╗ ████████╗ ██████╗██╗  ██╗
██║    ██║██╔══██╗╚══██╔══╝██╔════╝██║  ██║
██║ █╗ ██║███████║   ██║   ██║     ███████║
██║███╗██║██╔══██║   ██║   ██║     ██╔══██║
╚███╔███╔╝██║  ██║   ██║   ╚██████╗██║  ██║
 ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝    ╚═════╝╚═╝  ╚═╝

**********************************************/

gulp.task('watch', ['sass','html','scripts','images','videos', 'articles','copy'], function (){
    gulp.watch('app/scss/**', ['sass', 'images'])
    // gulp.watch('app/*.html', ['html'])
    gulp.watch('app/html/**/*.html', ['html'])
    gulp.watch('app/*.json', ['html'])
    gulp.watch('app/js/**/*.js',['scripts'])
    gulp.watch('app/partials/**/*.hbs',['sass','html','scripts','images','videos'])
    gulp.watch('app/data/**', ['data'])
    gulp.watch('app/article/**', ['articles'])
})

/*

██████╗  ██╗   ██╗ ██╗ ██╗      ██████╗
██╔══██╗ ██║   ██║ ██║ ██║      ██╔══██╗
██████╔╝ ██║   ██║ ██║ ██║      ██║  ██║
██╔══██╗ ██║   ██║ ██║ ██║      ██║  ██║
██████╔╝ ╚██████╔╝ ██║ ███████╗ ██████╔╝
╚═════╝   ╚═════╝  ╚═╝ ╚══════╝ ╚═════╝

**************************************/

gulp.task('build', function (callback) {
    runSequence('clean',
        ['sass', 'scripts', 'html', 'articles', 'images', 'videos'],
        callback
    )
})

gulp.task('clean', function() {
    return del.sync(paths.dist)
})

gulp.task('build-english',function(){
    paths.dist       = './dist/english'
    runSequence('build')
})

gulp.task('default', function (callback) {
    runSequence(['connectDist','watch','copy'],
        callback
    )
})
